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
 *   WHATSAPP_LOGISTICS_CHAT_ID — WhatsApp group/number chat ID (e.g. 9627XXXXXXXX@c.us or group@g.us)
 *   SUPABASE_SERVICE_ROLE_KEY  — auto-provided
 *   SUPABASE_URL               — auto-provided
 *   SUPABASE_ANON_KEY          — auto-provided
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

function opsDescription(rental: Record<string, unknown>): string {
  const li = (rental.logistics_info as Record<string, string>) || {};
  const si = (rental.sound_info as Record<string, string>) || {};
  const lines: string[] = [];

  if (rental.venue) lines.push(`Venue: ${rental.venue}`);
  if (rental.venue_address) lines.push(`Address: ${rental.venue_address}`);

  const logLines = [
    li.load_in_time && `Load-in: ${li.load_in_time}`,
    li.load_out_time && `Load-out: ${li.load_out_time}`,
    li.no_of_guests && `Guests: ${li.no_of_guests}`,
    si.soundcheck_time && `Soundcheck: ${si.soundcheck_time}`,
    li.equipment_summary && `Equipment: ${li.equipment_summary}`,
    li.technical_rider && `Technical rider: ${li.technical_rider}`,
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

// ── WhatsApp notification (Green API) ───────────────────────────────────────

async function sendWhatsAppLogistics(rental: Record<string, unknown>, q: Record<string, unknown>): Promise<void> {
  const instanceId = Deno.env.get('GREEN_API_INSTANCE_ID');
  const token = Deno.env.get('GREEN_API_TOKEN');
  const apiUrl = Deno.env.get('GREEN_API_URL');
  if (!instanceId || !token || !apiUrl) return; // silently skip if not configured

  const li = (rental.logistics_info as Record<string, string>) || {};
  const si = (rental.sound_info as Record<string, string>) || {};
  const start = new Date(rental.start_at as string);
  const end = new Date(rental.end_at as string);
  const tz = (rental.timezone as string) || 'Asia/Amman';
  const fmtEn = (d: Date) => d.toLocaleString('en-GB', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });
  const fmtAr = (d: Date) => d.toLocaleString('ar-JO', { dateStyle: 'full', timeStyle: 'short', timeZone: tz });
  const notes = li.notes || li.delivery_notes;

  const [notesAr, riderAr, titleAr, venueAr] = await Promise.all([
    notes ? translateToArabic(notes) : Promise.resolve(''),
    li.technical_rider ? translateToArabic(li.technical_rider) : Promise.resolve(''),
    rental.title ? translateToArabic(rental.title as string) : Promise.resolve(''),
    rental.venue ? translateToArabic(rental.venue as string) : Promise.resolve(''),
  ]);

  const english = [
    '📢 New Booking Confirmed',
    '─────────────────────',
    rental.title && `📋 Event: ${rental.title}`,
    q.client_name && `👤 Client: ${q.client_name}`,
    rental.venue && `📍 Venue: ${rental.venue}`,
    rental.venue_address && `🗺️ Address: ${rental.venue_address}`,
    `📅 Start: ${fmtEn(start)}`,
    `🏁 End: ${fmtEn(end)}`,
    li.load_in_time && `⏰ Load-in: ${li.load_in_time}`,
    li.load_out_time && `⏰ Load-out: ${li.load_out_time}`,
    li.no_of_guests && `👥 Guests: ${li.no_of_guests}`,
    si.soundcheck_time && `🎙️ Soundcheck: ${si.soundcheck_time}`,
    li.equipment_summary && `📦 Equipment: ${li.equipment_summary}`,
    li.technical_rider && `📋 Technical Rider: ${li.technical_rider}`,
    notes && `📝 Notes:\n${notes}`,
  ].filter(Boolean).join('\n');

  const arabic = [
    '📢 تم تأكيد حجز جديد',
    '─────────────────────',
    titleAr && `📋 الفعالية: ${titleAr}`,
    q.client_name && `👤 العميل: ${q.client_name}`,
    venueAr && `📍 المكان: ${venueAr}`,
    rental.venue_address && `🗺️ العنوان: ${rental.venue_address}`,
    `📅 البداية: ${fmtAr(start)}`,
    `🏁 النهاية: ${fmtAr(end)}`,
    li.load_in_time && `⏰ وقت التحميل: ${li.load_in_time}`,
    li.load_out_time && `⏰ وقت التفريغ: ${li.load_out_time}`,
    li.no_of_guests && `👥 عدد الضيوف: ${li.no_of_guests}`,
    si.soundcheck_time && `🎙️ وقت الساوند تشيك: ${si.soundcheck_time}`,
    li.equipment_summary && `📦 المعدات:\n${li.equipment_summary}`,
    riderAr && `📋 المتطلبات التقنية: ${riderAr}`,
    notesAr && `📝 ملاحظات:\n${toArabicNumerals(notesAr)}`,
  ].filter(Boolean).join('\n');

  const toChatIds = (arr: unknown) =>
    ((arr as string[]) || []).map(n => n.replace(/\D/g, '')).filter(Boolean).map(n => `${n}@c.us`);

  const englishRecipients = toChatIds(rental.whatsapp_english_recipients);
  const arabicRecipients = toChatIds(rental.whatsapp_arabic_recipients);

  const send = (cid: string, message: string) => fetch(`${apiUrl}/waInstance${instanceId}/sendMessage/${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chatId: cid, message }),
  });

  for (const cid of englishRecipients) await send(cid, english);
  for (const cid of arabicRecipients) await send(cid, arabic);
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
      // ponytail: fire-and-forget, WhatsApp failure must not break calendar sync
      sendWhatsAppLogistics(rental, q).catch(e => console.warn('WhatsApp notify failed:', e));
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
