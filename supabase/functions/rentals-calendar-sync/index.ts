/**
 * rentals-calendar-sync Edge Function
 *
 * Creates / updates two role-scoped Google Calendar events for a rental booking:
 *   • Ops event     → logistics + sound-eng team (operational info only)
 *   • Finance event → finance + partner (full financial + operational info)
 *
 * Google auth: OAuth refresh token stored in v1_google_oauth_tokens (nadeem@nogahub.com).
 * Events appear on the connected user's primary calendar; invites sent as that user.
 * All secrets stored in Supabase Edge Function secrets — never in the browser bundle.
 *
 * Required secrets (set via: supabase secrets set KEY=value):
 *   GOOGLE_OAUTH_CLIENT_ID
 *   GOOGLE_OAUTH_CLIENT_SECRET
 *   GCAL_FINANCE_EMAIL         — finance (accounting@nogahub.com)
 *   GCAL_PARTNER_EMAIL         — partner (nadeem@nogahub.com)
 *   GREEN_API_INSTANCE_ID      — Green API instance ID (e.g. 710701671399)
 *   GREEN_API_TOKEN            — Green API apiTokenInstance
 *   GREEN_API_URL              — Green API base URL (e.g. https://7107.api.greenapi.com)
 *   SUPABASE_SERVICE_ROLE_KEY  — auto-provided
 *   SUPABASE_URL               — auto-provided
 *   SUPABASE_ANON_KEY          — auto-provided
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.2';
import { ARABIC_FONT_BASE64, ARABIC_FONT_BOLD_BASE64 } from './arabic-font-data.ts';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ── Google OAuth — get access token from stored refresh token ───────────────

async function getAccessToken(admin: ReturnType<typeof createClient>): Promise<string> {
  const { data: tokenRow, error } = await admin
    .from('v1_google_oauth_tokens')
    .select('email, refresh_token, access_token, access_token_expires_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !tokenRow) {
    throw new Error('Google Calendar not connected. Please connect your Google account from the Rental Calendar page.');
  }

  // Return cached access token if still valid (with 60s buffer)
  if (tokenRow.access_token && tokenRow.access_token_expires_at) {
    const expiresAt = new Date(tokenRow.access_token_expires_at).getTime();
    if (Date.now() < expiresAt - 60_000) {
      return tokenRow.access_token;
    }
  }

  // Refresh
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokenRow.refresh_token,
      client_id: Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error(`Token refresh failed: ${JSON.stringify(data)}`);

  const expiresAt = new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString();
  await admin.from('v1_google_oauth_tokens').update({
    access_token: data.access_token,
    access_token_expires_at: expiresAt,
  }).eq('email', tokenRow.email);

  return data.access_token;
}

// ── Google Calendar API ─────────────────────────────────────────────────────

async function upsertEvent(token: string, existingId: string | null, event: object): Promise<string> {
  const base = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const url = existingId ? `${base}/${existingId}?sendUpdates=all` : `${base}?sendUpdates=all`;
  const method = existingId ? 'PATCH' : 'POST';

  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  });
  if (!res.ok) throw new Error(`Calendar ${method} ${res.status}: ${await res.text()}`);
  return (await res.json()).id;
}

async function deleteEvent(token: string, eventId: string): Promise<void> {
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}?sendUpdates=all`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } },
  );
}

// ── Description builders ────────────────────────────────────────────────────

function fmtLocal(iso: string, tz: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: tz || 'Asia/Amman' });
}

function bulletize(text: string): string {
  return (text || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => `• ${l}`).join('\n');
}

function opsDescription(rental: Record<string, unknown>): string {
  const li = (rental.logistics_info as Record<string, string>) || {};
  const si = (rental.sound_info as Record<string, string>) || {};
  const tz = rental.timezone as string;
  const lines: string[] = [];

  if (rental.venue) lines.push(`Venue: ${rental.venue}`);
  if (rental.venue_address) lines.push(`Address: ${rental.venue_address}`);
  if (rental.venue_contact_name || rental.venue_contact_phone) {
    lines.push(`Venue contact: ${[rental.venue_contact_name, rental.venue_contact_phone].filter(Boolean).join(' ')}`);
  }

  const rider = si.technical_rider || li.technical_rider;
  const logLines = [
    (li.name || li.phone) && `Logistics: ${[li.name, li.phone].filter(Boolean).join(' ')}`,
    li.uninstall_from && `Uninstall from: ${li.uninstall_from}`,
    li.load_in_time && `Load-in: ${fmtLocal(li.load_in_time, tz)}`,
    li.load_out_time && `Load-out: ${fmtLocal(li.load_out_time, tz)}`,
    li.install_in && `Install in: ${li.install_in}`,
    li.no_of_guests && `Guests: ${li.no_of_guests}`,
    (si.name || si.phone) && `Sound engineer: ${[si.name, si.phone].filter(Boolean).join(' ')}`,
    si.soundcheck_time && `Soundcheck: ${fmtLocal(si.soundcheck_time, tz)}`,
    (si.artist_name || si.artist_phone || si.artist_email) && `Artist: ${[si.artist_name, si.artist_phone, si.artist_email].filter(Boolean).join(' ')}`,
    li.equipment_summary && `Equipment:\n${bulletize(li.equipment_summary)}`,
    rider && `Technical rider: ${rider}`,
    (li.notes || li.delivery_notes) && `Notes: ${li.notes || li.delivery_notes}`,
  ].filter(Boolean);
  if (logLines.length) lines.push(`\n── EVENT INFO ──\n${logLines.join('\n')}`);

  return lines.join('\n');
}

function financeDescription(rental: Record<string, unknown>, q: Record<string, unknown>): string {
  const cr = (q.calculation_results as Record<string, number>) || {};
  return [
    `Event: ${rental.title || q.project_name || ''}`,
    `Client: ${q.client_name || ''}`,
    `Quotation Total: ${Number(q.total || 0).toFixed(2)} JOD`,
    Number(cr.profit) > 0 && `Profit: ${Number(cr.profit).toFixed(2)} JOD`,
  ].filter(Boolean).join('\n');
}

// ── Translation (unofficial Google Translate — no key required) ─────────────

function toArabicNumerals(text: string): string {
  return text.replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
}

async function translateToArabic(text: string): Promise<string> {
  if (!text?.trim()) return text;
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ar&dt=t&q=${encodeURIComponent(text)}`;
    const res = await fetch(url);
    const data = await res.json();
    return (data[0] as unknown[][]).map(chunk => chunk[0]).join('');
  } catch {
    return text;
  }
}

// ── Booking code ─────────────────────────────────────────────────────────────

function generateBookingCode(rental: Record<string, unknown>): string {
  const tz = (rental.timezone as string) || 'Asia/Amman';
  const d = new Date(rental.start_at as string);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d).reduce((acc, p) => ({ ...acc, [p.type]: p.value }), {} as Record<string, string>);
  const seq = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
  return `NGH-${parts.year}${parts.month}${parts.day}-${seq}`;
}

// ── PDF (English page 1 / Arabic page 2) ────────────────────────────────────

type PdfField = { label: string; value: string; multiline?: boolean };
type PdfSection = { header: string; fields: PdfField[] };

async function buildEventPdf(rental: Record<string, unknown>, q: Record<string, unknown>, bookingCode: string): Promise<Uint8Array> {
  const li = (rental.logistics_info as Record<string, string>) || {};
  const si = (rental.sound_info as Record<string, string>) || {};
  const start = new Date(rental.start_at as string);
  const end = new Date(rental.end_at as string);
  const tz = (rental.timezone as string) || 'Asia/Amman';
  const fmtEn = (d: Date) => d.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });
  const fmtAr = (d: Date) => d.toLocaleString('ar-JO', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });
  const notes = li.notes || li.delivery_notes;
  const rider = si.technical_rider || li.technical_rider; // kept in English on both pages — not translated, per request
  const loadIn = li.load_in_time ? new Date(li.load_in_time) : null;
  const loadOut = li.load_out_time ? new Date(li.load_out_time) : null;
  const soundcheck = si.soundcheck_time ? new Date(si.soundcheck_time) : null;

  // Everything user-facing is translated except equipment list + technical rider.
  const [
    notesAr, titleAr, venueAr, uninstallAr, installAr,
    clientNameAr, venueAddressAr, venueContactNameAr, logisticsNameAr, soundNameAr, artistNameAr,
  ] = await Promise.all([
    notes ? translateToArabic(notes) : Promise.resolve(''),
    rental.title ? translateToArabic(rental.title as string) : Promise.resolve(''),
    rental.venue ? translateToArabic(rental.venue as string) : Promise.resolve(''),
    li.uninstall_from ? translateToArabic(li.uninstall_from) : Promise.resolve(''),
    li.install_in ? translateToArabic(li.install_in) : Promise.resolve(''),
    q.client_name ? translateToArabic(q.client_name as string) : Promise.resolve(''),
    rental.venue_address ? translateToArabic(rental.venue_address as string) : Promise.resolve(''),
    rental.venue_contact_name ? translateToArabic(rental.venue_contact_name as string) : Promise.resolve(''),
    li.name ? translateToArabic(li.name) : Promise.resolve(''),
    si.name ? translateToArabic(si.name) : Promise.resolve(''),
    si.artist_name ? translateToArabic(si.artist_name) : Promise.resolve(''),
  ]);

  const equipmentEn = bulletize(li.equipment_summary); // untranslated, per request

  const venueContactEn = [rental.venue_contact_name, rental.venue_contact_phone].filter(Boolean).join(' ');
  const logisticsContactEn = [li.name, li.phone].filter(Boolean).join(' ');
  const soundContactEn = [si.name, si.phone].filter(Boolean).join(' ');
  const artistEn = [si.artist_name, si.artist_phone, si.artist_email].filter(Boolean).join(' ');

  const venueContactAr = [venueContactNameAr, toArabicNumerals(rental.venue_contact_phone as string || '')].filter(Boolean).join(' ');
  const logisticsContactAr = [logisticsNameAr, toArabicNumerals(li.phone || '')].filter(Boolean).join(' ');
  const soundContactAr = [soundNameAr, toArabicNumerals(si.phone || '')].filter(Boolean).join(' ');
  const artistAr = [artistNameAr, toArabicNumerals(si.artist_phone || ''), si.artist_email].filter(Boolean).join(' ');

  const f = (label: string, value: unknown, multiline = false): PdfField => ({ label, value: value ? String(value) : '', multiline });

  const sectionsEn: PdfSection[] = [
    {
      header: 'Event Info', fields: [
        f('Event', rental.title),
        f('Client', q.client_name),
        f('Venue', rental.venue),
        f('Address', rental.venue_address),
        f('Venue contact', venueContactEn),
        f('Start', fmtEn(start)),
        f('End', fmtEn(end)),
      ],
    },
    {
      header: 'Logistics', fields: [
        f('Logistics', logisticsContactEn),
        f('Uninstall from', li.uninstall_from),
        f('Load-in', loadIn && fmtEn(loadIn)),
        f('Load-out', loadOut && fmtEn(loadOut)),
        f('Install in', li.install_in),
        f('Guests', li.no_of_guests),
        f('Equipment', equipmentEn, true),
      ],
    },
    {
      header: 'Sound Engineering', fields: [
        f('Sound engineer', soundContactEn),
        f('Soundcheck', soundcheck && fmtEn(soundcheck)),
        f('Artist', artistEn),
        f('Technical Rider', rider, true),
      ],
    },
  ];
  if (notes) sectionsEn.push({ header: 'Notes', fields: [f('', notes, true)] });

  const sectionsAr: PdfSection[] = [
    {
      header: 'معلومات الفعالية', fields: [
        f('الفعالية', titleAr),
        f('العميل', clientNameAr),
        f('المكان', venueAr),
        f('العنوان', venueAddressAr),
        f('جهة اتصال المكان', venueContactAr),
        f('البداية', fmtAr(start)),
        f('النهاية', fmtAr(end)),
      ],
    },
    {
      header: 'اللوجستيات', fields: [
        f('اللوجستيات', logisticsContactAr),
        f('التفكيك من', uninstallAr),
        f('وقت التحميل', loadIn && fmtAr(loadIn)),
        f('وقت التفريغ', loadOut && fmtAr(loadOut)),
        f('التركيب في', installAr),
        f('عدد الضيوف', li.no_of_guests && toArabicNumerals(String(li.no_of_guests))),
        f('المعدات', equipmentEn, true), // label translated, list stays English per request
      ],
    },
    {
      header: 'الهندسة الصوتية', fields: [
        f('مهندس الصوت', soundContactAr),
        f('وقت الساوند تشيك', soundcheck && fmtAr(soundcheck)),
        f('الفنان', artistAr),
        f('الرايدر التقني', rider, true), // label translated, list stays English per request
      ],
    },
  ];
  if (notesAr) sectionsAr.push({ header: 'ملاحظات', fields: [f('', toArabicNumerals(notesAr), true)] });

  const doc = new jsPDF();
  const marginX = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - marginX * 2;
  const headerH = 22;
  const lineH = 6;

  doc.addFileToVFS('Amiri-Regular.ttf', ARABIC_FONT_BASE64);
  doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
  doc.addFileToVFS('Amiri-Bold.ttf', ARABIC_FONT_BOLD_BASE64);
  doc.addFont('Amiri-Bold.ttf', 'Amiri', 'bold');

  const drawTopBar = (rtl: boolean) => {
    doc.setFillColor(20, 20, 20);
    doc.rect(0, 0, pageWidth, headerH, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont(rtl ? 'Amiri' : 'helvetica', 'bold');
    doc.setFontSize(15);
    doc.text(rtl ? 'تفاصيل الحجز' : 'Booking Details', rtl ? pageWidth - marginX : marginX, 14, { align: rtl ? 'right' : 'left' });
    doc.setFont(rtl ? 'Amiri' : 'helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(bookingCode, rtl ? marginX : pageWidth - marginX, 14, { align: rtl ? 'left' : 'right' });
    doc.setTextColor(0, 0, 0);
  };

  // Draws "label: value" on one line — bold label, normal value. Falls back to a
  // plain wrapped line (label losing its bold) only for the rare overlong value.
  const drawField = (fontName: string, rtl: boolean, y: number, label: string, value: string): number => {
    const labelText = `${label}:`;
    doc.setFont(fontName, 'bold');
    const labelW = doc.getTextWidth(labelText);
    doc.setFont(fontName, 'normal');
    const valueW = doc.getTextWidth(value);
    const gap = 2;
    if (labelW + gap + valueW <= contentWidth) {
      const edge = rtl ? pageWidth - marginX : marginX;
      doc.setFont(fontName, 'bold');
      doc.text(labelText, edge, y, { align: rtl ? 'right' : 'left' });
      doc.setFont(fontName, 'normal');
      const valueX = rtl ? edge - labelW - gap : edge + labelW + gap;
      doc.text(value, valueX, y, { align: rtl ? 'right' : 'left' });
      return 1;
    }
    const wrapped: string[] = doc.splitTextToSize(`${labelText} ${value}`, contentWidth);
    wrapped.forEach((w, i) => doc.text(w, rtl ? pageWidth - marginX : marginX, y + i * lineH, { align: rtl ? 'right' : 'left' }));
    return wrapped.length;
  };

  const writeSections = (sections: PdfSection[], rtl: boolean) => {
    const fontName = rtl ? 'Amiri' : 'helvetica';
    drawTopBar(rtl);
    let y = headerH + 12;
    const ensureRoom = () => { if (y > 280) { doc.addPage(); y = 20; } };
    for (const section of sections) {
      const fields = section.fields.filter(field => field.value);
      if (!fields.length) continue;
      if (y > 265) { doc.addPage(); y = 20; }
      doc.setFont(fontName, 'bold');
      doc.setFontSize(12);
      doc.setTextColor(90, 90, 90);
      doc.text(section.header, rtl ? pageWidth - marginX : marginX, y, { align: rtl ? 'right' : 'left' });
      y += 5;
      doc.setDrawColor(210, 210, 210);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 7;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10.5);
      for (const field of fields) {
        ensureRoom();
        if (field.multiline) {
          if (field.label) {
            doc.setFont(fontName, 'bold');
            doc.text(`${field.label}:`, rtl ? pageWidth - marginX : marginX, y, { align: rtl ? 'right' : 'left' });
            y += lineH;
          }
          doc.setFont(fontName, 'normal');
          const wrapped: string[] = doc.splitTextToSize(field.value, contentWidth);
          for (const w of wrapped) {
            ensureRoom();
            doc.text(w, rtl ? pageWidth - marginX : marginX, y, { align: rtl ? 'right' : 'left' });
            y += lineH;
          }
        } else {
          y += drawField(fontName, rtl, y, field.label, field.value) * lineH;
        }
      }
      y += 6;
    }
  };

  writeSections(sectionsEn, false);
  doc.addPage();
  writeSections(sectionsAr, true);

  return new Uint8Array(doc.output('arraybuffer'));
}

// ── WhatsApp notifications (Green API) ──────────────────────────────────────

function toChatId(countryCode: string, n: string): string {
  const digits = (n || '').replace(/\D/g, '').replace(/^0+/, '');
  return digits ? `${countryCode}${digits}@c.us` : '';
}

async function sendWhatsAppText(apiUrl: string, instanceId: string, token: string, chatId: string, message: string): Promise<void> {
  await fetch(`${apiUrl}/waInstance${instanceId}/sendMessage/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId, message }),
  });
}

async function sendWhatsAppFile(apiUrl: string, instanceId: string, token: string, chatId: string, caption: string, fileName: string, fileBytes: Uint8Array): Promise<void> {
  const form = new FormData();
  form.set('chatId', chatId);
  form.set('caption', caption);
  form.set('fileName', fileName);
  form.set('file', new Blob([fileBytes as BlobPart], { type: 'application/pdf' }), fileName);
  await fetch(`${apiUrl}/waInstance${instanceId}/sendFileByUpload/${token}`, { method: 'POST', body: form });
}

async function sendRentalNotifications(rental: Record<string, unknown>, q: Record<string, unknown>, bookingCode: string): Promise<void> {
  const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
  const token = Deno.env.get('GREEN_API_TOKEN');
  const apiUrl = Deno.env.get('GREEN_API_URL');
  if (!instanceId || !token || !apiUrl) return; // silently skip if not configured

  const cc = (rental.country_code as string) || '962';
  const tz = (rental.timezone as string) || 'Asia/Amman';
  const start = new Date(rental.start_at as string);
  const end = new Date(rental.end_at as string);
  const fmtEn = (d: Date) => d.toLocaleString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: tz }) +
    ` at ${d.toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })}`;

  // Client confirmation
  const clientChatId = toChatId(cc, rental.client_phone as string);
  if (clientChatId) {
    const message = [
      `Dear ${q.client_name || rental.client_name || 'Client'},`,
      '',
      'Your booking is confirmed:',
      `Booking ID: ${bookingCode}`,
      `Event: ${rental.title || ''}`,
      `Venue: ${rental.venue || ''}`,
      `Address: ${rental.venue_address || ''}`,
      `Start: ${fmtEn(start)}`,
      `End: ${fmtEn(end)}`,
      '',
      'Nogahub wishes you a beautiful event!',
    ].join('\n');
    await sendWhatsAppText(apiUrl, instanceId, token, clientChatId, message);
  }

  // Team PDF (logistics + sound engineer)
  const li = (rental.logistics_info as Record<string, string>) || {};
  const si = (rental.sound_info as Record<string, string>) || {};
  const teamChatIds = new Set([toChatId(cc, li.phone), toChatId(cc, si.phone)].filter(Boolean));
  if (teamChatIds.size) {
    const pdfBytes = await buildEventPdf(rental, q, bookingCode);
    const caption = [
      'New Event Confirmed!',
      `Date: ${fmtEn(start)}`,
      `Location: ${rental.venue || ''}`,
    ].join('\n');
    const fileName = `${bookingCode}.pdf`;
    for (const cid of teamChatIds) await sendWhatsAppFile(apiUrl, instanceId, token, cid, caption, fileName, pdfBytes);
  }
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });

  try {
    const { rental_id, action = 'sync' } = await req.json() as { rental_id: string; action?: string };
    if (!rental_id) return new Response(JSON.stringify({ error: 'rental_id required' }), { status: 400, headers: CORS_HEADERS });

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: rental, error: rErr } = await admin
      .from('v1_rentals')
      .select('*, rental_quotation:rental_quotation_id(project_name, client_name, total, calculation_results)')
      .eq('id', rental_id)
      .single();
    if (rErr || !rental) throw new Error(`Rental not found: ${rErr?.message}`);

    const q = (rental.rental_quotation as Record<string, unknown>) || {};

    const token = await getAccessToken(admin);

    // ── Cancel ──
    if (action === 'cancel') {
      if (rental.gcal_ops_event_id) await deleteEvent(token, rental.gcal_ops_event_id);
      if (rental.gcal_finance_event_id) await deleteEvent(token, rental.gcal_finance_event_id);
      await admin.from('v1_rentals').update({
        status: 'cancelled', sync_status: 'synced',
        gcal_ops_event_id: null, gcal_finance_event_id: null,
        last_synced_at: new Date().toISOString(),
      }).eq('id', rental_id);
      return new Response(JSON.stringify({ ok: true, action: 'cancelled' }), { headers: CORS_HEADERS });
    }

    // ── Sync ──
    const gcalTime = (ts: string) => ({ dateTime: ts, timeZone: rental.timezone || 'Asia/Amman' });
    const summary = rental.title || `Rental: ${q.client_name || ''}`;

    const opsEvent = {
      summary,
      description: opsDescription(rental),
      start: gcalTime(rental.start_at),
      end: gcalTime(rental.end_at),
      attendees: [
        ...((rental.additional_attendees as string[]) || []).map((e: string) => ({ email: e })),
      ],
    };

    const finEvent = {
      summary: `[Finance] ${summary}`,
      description: financeDescription(rental, q),
      start: gcalTime(rental.start_at),
      end: gcalTime(rental.end_at),
      attendees: [
        { email: Deno.env.get('GCAL_FINANCE_EMAIL') || 'accounting@nogahub.com' },
        { email: Deno.env.get('GCAL_PARTNER_EMAIL') || 'nadeem@nogahub.com' },
        { email: 'issa@nogahub.com' },
      ],
    };

    let opsId: string | null = rental.gcal_ops_event_id;
    let finId: string | null = rental.gcal_finance_event_id;
    let syncError: string | null = null;

    try { opsId = await upsertEvent(token, opsId, opsEvent); } catch (e) { syncError = `Ops: ${(e as Error).message}`; }
    try { finId = await upsertEvent(token, finId, finEvent); } catch (e) { syncError = syncError ? `${syncError} | Fin: ${(e as Error).message}` : `Fin: ${(e as Error).message}`; }

    await admin.from('v1_rentals').update({
      gcal_ops_event_id: opsId,
      gcal_finance_event_id: finId,
      sync_status: syncError ? 'failed' : 'synced',
      last_synced_at: new Date().toISOString(),
      sync_error: syncError,
    }).eq('id', rental_id);

    if (!syncError) {
      const bookingCode = (rental.booking_code as string) || generateBookingCode(rental);
      if (!rental.booking_code) await admin.from('v1_rentals').update({ booking_code: bookingCode }).eq('id', rental_id);
      // ponytail: fire-and-forget, WhatsApp failure must not break calendar sync
      sendRentalNotifications(rental, q, bookingCode).catch(e => console.warn('WhatsApp notify failed:', e));
    }

    return new Response(
      JSON.stringify({ ok: true, sync_status: syncError ? 'failed' : 'synced', ops_event_id: opsId, finance_event_id: finId, error: syncError }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('rentals-calendar-sync:', err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
