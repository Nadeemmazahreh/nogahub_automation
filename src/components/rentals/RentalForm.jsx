/**
 * RentalForm — modal for creating / editing a rental booking.
 * On submit: creates the DB row then calls the Edge Function to sync Google Calendar.
 * Imported by: RentalCalendar.jsx
 */

import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, RefreshCw, Loader } from 'lucide-react';
import toast from 'react-hot-toast';
import rentalsService from '../../services/rentalsService';

function toLocalDatetimeValue(date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addHours(date, h) {
  const d = new Date(date);
  d.setHours(d.getHours() + h);
  return d;
}

function toLocalPhone(raw) {
  if (!raw) return raw;
  const digits = raw.replace(/\D/g, '');
  return digits.startsWith('962') ? `0${digits.slice(3)}` : raw;
}

export default function RentalForm({ initialDate, rental, onSaved, onClose }) {
  const isEdit = Boolean(rental);
  const defaultStart = initialDate || new Date();
  const defaultEnd = addHours(defaultStart, 4);

  const [quotations, setQuotations] = useState([]);
  const [quotationsLoading, setQuotationsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const DEFAULT_NOTES = 'For financial matters please contact Ammar at 0790149224';

  const EMPTY_LOGISTICS = {
    name: 'Mustafa Kanaan', phone: '078885679', email: '',
    uninstall_from: '', load_in_time: '', load_out_time: '', install_in: '',
    equipment_summary: '', no_of_guests: '', language: 'ar',
    notes: DEFAULT_NOTES,
  };
  const EMPTY_SOUND = {
    name: 'Sufian AlSaed', phone: '0799833020', soundcheck_time: '', technical_rider: '',
    artist_name: '', artist_phone: '', artist_email: '', language: 'en',
  };

  const [form, setForm] = useState({
    rental_quotation_id: '',
    title: '',
    client_name: '',
    start_at: toLocalDatetimeValue(isEdit ? rental.start_at : defaultStart),
    end_at: toLocalDatetimeValue(isEdit ? rental.end_at : defaultEnd),
    venue: '',
    venue_address: '',
    venue_contact_name: '',
    venue_contact_phone: '',
    country_code: '962',
    logistics_info: { ...EMPTY_LOGISTICS },
    sound_info: { ...EMPTY_SOUND },
    additional_attendees: '',
    whatsapp_arabic_recipients: '',
    whatsapp_english_recipients: '',
  });

  useEffect(() => {
    if (rental) {
      setForm({
        rental_quotation_id: rental.rental_quotation_id || '',
        title: rental.title || '',
        client_name: rental.client_name || '',
        start_at: toLocalDatetimeValue(rental.start_at),
        end_at: toLocalDatetimeValue(rental.end_at),
        venue: rental.venue || '',
        venue_address: rental.venue_address || '',
        venue_contact_name: rental.venue_contact_name || '',
        venue_contact_phone: toLocalPhone(rental.venue_contact_phone) || '',
        country_code: rental.country_code || '962',
        logistics_info: {
          ...EMPTY_LOGISTICS,
          // ponytail: merge legacy delivery_notes + engineer_notes into notes on load
          notes: (rental.logistics_info?.notes) || [rental.logistics_info?.delivery_notes, rental.sound_info?.engineer_notes].filter(Boolean).join('\n') || DEFAULT_NOTES,
          ...(rental.logistics_info || {}),
          phone: toLocalPhone(rental.logistics_info?.phone) || EMPTY_LOGISTICS.phone,
          load_in_time: toLocalDatetimeValue(rental.logistics_info?.load_in_time),
          load_out_time: toLocalDatetimeValue(rental.logistics_info?.load_out_time),
        },
        sound_info: {
          ...EMPTY_SOUND,
          ...(rental.sound_info || {}),
          // legacy rows stored the rider under logistics_info
          technical_rider: rental.sound_info?.technical_rider || rental.logistics_info?.technical_rider || '',
          phone: toLocalPhone(rental.sound_info?.phone) || EMPTY_SOUND.phone,
          artist_phone: toLocalPhone(rental.sound_info?.artist_phone) || '',
          soundcheck_time: toLocalDatetimeValue(rental.sound_info?.soundcheck_time),
        },
        additional_attendees: (rental.additional_attendees || []).join(', '),
        whatsapp_arabic_recipients: (rental.whatsapp_arabic_recipients || []).join(', '),
        whatsapp_english_recipients: (rental.whatsapp_english_recipients || []).join(', '),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rental]);

  useEffect(() => {
    rentalsService.listQuotations()
      .then(setQuotations)
      .catch(e => toast.error(`Failed to load quotations: ${e.message}`))
      .finally(() => setQuotationsLoading(false));
  }, []);

  function handleQuotationChange(e) {
    const id = e.target.value;
    const q = quotations.find(q => q.id === id);
    const summarize = (items) => (items || [])
      .filter(item => item.name)
      .map(item => item.quantity > 1 ? `${item.quantity}× ${item.name}` : item.name)
      .join('\n');
    const equipmentSummary = summarize(q?.custom_equipment);
    const riderSummary = summarize(q?.technical_rider);
    setForm(f => ({
      ...f,
      rental_quotation_id: id,
      client_name: q?.client_name || f.client_name,
      title: f.title || q?.project_name || '',
      logistics_info: {
        ...f.logistics_info,
        equipment_summary: equipmentSummary || f.logistics_info.equipment_summary,
      },
      sound_info: {
        ...f.sound_info,
        technical_rider: riderSummary || f.sound_info.technical_rider,
      },
    }));
  }

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setLi = (key, val) => setForm(f => ({ ...f, logistics_info: { ...f.logistics_info, [key]: val } }));
  const setSi = (key, val) => setForm(f => ({ ...f, sound_info: { ...f.sound_info, [key]: val } }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.rental_quotation_id) { toast.error('Please select a rental quotation'); return; }
    if (!form.start_at || !form.end_at) { toast.error('Start and end date/time required'); return; }
    if (new Date(form.start_at) >= new Date(form.end_at)) { toast.error('End must be after start'); return; }

    setSubmitting(true);
    try {
      const payload = {
        rental_quotation_id: form.rental_quotation_id,
        title: form.title.trim() || null,
        client_name: form.client_name.trim() || null,
        start_at: new Date(form.start_at).toISOString(),
        end_at: new Date(form.end_at).toISOString(),
        venue: form.venue.trim() || null,
        venue_address: form.venue_address.trim() || null,
        venue_contact_name: form.venue_contact_name.trim() || null,
        venue_contact_phone: form.venue_contact_phone.trim() || null,
        country_code: form.country_code.trim() || '962',
        logistics_info: {
          ...form.logistics_info,
          load_in_time: form.logistics_info.load_in_time ? new Date(form.logistics_info.load_in_time).toISOString() : '',
          load_out_time: form.logistics_info.load_out_time ? new Date(form.logistics_info.load_out_time).toISOString() : '',
        },
        sound_info: {
          ...form.sound_info,
          soundcheck_time: form.sound_info.soundcheck_time ? new Date(form.sound_info.soundcheck_time).toISOString() : '',
        },
        additional_attendees: form.additional_attendees.split(',').map(s => s.trim()).filter(Boolean),
        whatsapp_arabic_recipients: form.whatsapp_arabic_recipients.split(',').map(s => s.trim()).filter(Boolean),
        whatsapp_english_recipients: form.whatsapp_english_recipients.split(',').map(s => s.trim()).filter(Boolean),
      };

      if (isEdit) {
        await rentalsService.updateRental(rental.id, payload);
        const syncId = 'cal-sync';
        toast.loading('Syncing Google Calendar…', { id: syncId });
        try {
          await rentalsService.resyncRental(rental.id);
          toast.success('Rental updated & calendar synced', { id: syncId });
        } catch {
          toast.error('Saved — calendar sync failed. Use Resync.', { id: syncId });
        }
      } else {
        const { syncResult } = await rentalsService.createAndSync(payload);
        if (syncResult?.error) {
          toast.success('Rental saved — calendar sync failed. Use Resync.');
        } else {
          toast.success('Rental booked & Google Calendar events created!');
        }
      }
      onSaved();
    } catch (err) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancelRental() {
    if (!rental) { onClose(); return; }
    if (!window.confirm('Cancel this rental? Google Calendar events will be deleted.')) return;
    try {
      await rentalsService.cancelRental(rental.id);
      toast.success('Rental cancelled and calendar events removed');
      onSaved();
    } catch (err) {
      toast.error(`Cancel failed: ${err.message}`);
    }
  }

  const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-black focus:border-black outline-none';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';
  const sec = 'border border-gray-100 rounded-xl p-4 space-y-3';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Calendar size={17} className="text-gray-700" />
            <h2 className="font-semibold text-gray-900">{isEdit ? 'Edit Rental' : 'Book Rental'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Quotation */}
          <div className={sec}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quotation</p>
            <div>
              <label className={lbl}>Select Quotation *</label>
              {quotationsLoading ? (
                <p className="text-sm text-gray-400 py-2">Loading quotations…</p>
              ) : (
                <select value={form.rental_quotation_id} onChange={handleQuotationChange} required className={inp}>
                  <option value="">— Select a quotation —</option>
                  {quotations.map(q => (
                    <option key={q.id} value={q.id}>
                      {q.project_name} — {q.client_name} ({Number(q.total || 0).toFixed(2)} JOD)
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Event Title</label>
                <input className={inp} value={form.title} onChange={e => set('title', e.target.value)} placeholder="Auto-filled from quotation" />
              </div>
              <div>
                <label className={lbl}>Client Name</label>
                <input className={inp} value={form.client_name} onChange={e => set('client_name', e.target.value)} placeholder="Auto-filled from quotation" />
              </div>
            </div>
          </div>

          {/* Event Info */}
          <div className={sec}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Calendar size={11} /> Event Info <span className="font-normal normal-case">(Asia/Amman)</span>
            </p>
            <div>
              <label className={lbl}>Venue Name</label>
              <input className={inp} value={form.venue} onChange={e => set('venue', e.target.value)} placeholder="e.g. Royal Cultural Centre, Amman" />
            </div>
            <div>
              <label className={lbl}>Address</label>
              <input className={inp} value={form.venue_address} onChange={e => set('venue_address', e.target.value)} placeholder="Street, City" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Start *</label>
                <input type="datetime-local" className={inp} value={form.start_at} onChange={e => set('start_at', e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>End *</label>
                <input type="datetime-local" className={inp} value={form.end_at} onChange={e => set('end_at', e.target.value)} required />
              </div>
              <div>
                <label className={lbl}>No. of Guests</label>
                <input className={inp} value={form.logistics_info.no_of_guests} onChange={e => setLi('no_of_guests', e.target.value)} placeholder="e.g. 500" />
              </div>
              <div>
                <label className={lbl}>Venue Contact Name</label>
                <input className={inp} value={form.venue_contact_name} onChange={e => set('venue_contact_name', e.target.value)} placeholder="e.g. Ahmad" />
              </div>
              <div>
                <label className={lbl}>Venue Contact Number</label>
                <input className={inp} value={form.venue_contact_phone} onChange={e => set('venue_contact_phone', e.target.value)} placeholder="e.g. 0790000000" />
              </div>
            </div>
          </div>

          {/* Logistics */}
          <div className={sec}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Logistics</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Name</label>
                <input className={inp} value={form.logistics_info.name} onChange={e => setLi('name', e.target.value)} placeholder="Logistics contact name" />
              </div>
              <div>
                <label className={lbl}>Number</label>
                <input className={inp} value={form.logistics_info.phone} onChange={e => setLi('phone', e.target.value)} placeholder="e.g. 0780000000" />
              </div>
              <div>
                <label className={lbl}>Email</label>
                <input type="email" className={inp} value={form.logistics_info.email} onChange={e => setLi('email', e.target.value)} placeholder="e.g. logistics@nogahub.com" />
              </div>
              <div>
                <label className={lbl}>Uninstall From</label>
                <input className={inp} value={form.logistics_info.uninstall_from} onChange={e => setLi('uninstall_from', e.target.value)} placeholder="e.g. Warehouse / previous venue" />
              </div>
              <div>
                <label className={lbl}>Load-in</label>
                <input type="datetime-local" className={inp} value={form.logistics_info.load_in_time} onChange={e => setLi('load_in_time', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Load-out</label>
                <input type="datetime-local" className={inp} value={form.logistics_info.load_out_time} onChange={e => setLi('load_out_time', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Install In</label>
                <input className={inp} value={form.logistics_info.install_in} onChange={e => setLi('install_in', e.target.value)} placeholder="e.g. Main hall, stage left" />
              </div>
              <div>
                <label className={lbl}>Language</label>
                <select className={inp} value={form.logistics_info.language} onChange={e => setLi('language', e.target.value)}>
                  <option value="ar">Arabic</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div>
              <label className={lbl}>Equipment (auto-filled from quotation)</label>
              <textarea className={inp} rows={3} value={form.logistics_info.equipment_summary} onChange={e => setLi('equipment_summary', e.target.value)} placeholder={'e.g. 12× L-Acoustics K2\n2× subs'} />
            </div>
          </div>

          {/* Sound Engineering */}
          <div className={sec}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Sound Engineering</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Name</label>
                <input className={inp} value={form.sound_info.name} onChange={e => setSi('name', e.target.value)} placeholder="Sound engineer name" />
              </div>
              <div>
                <label className={lbl}>Number</label>
                <input className={inp} value={form.sound_info.phone} onChange={e => setSi('phone', e.target.value)} placeholder="e.g. 0790000000" />
              </div>
              <div>
                <label className={lbl}>Sound Check</label>
                <input type="datetime-local" className={inp} value={form.sound_info.soundcheck_time} onChange={e => setSi('soundcheck_time', e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Language</label>
                <select className={inp} value={form.sound_info.language} onChange={e => setSi('language', e.target.value)}>
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Artist Name</label>
                <input className={inp} value={form.sound_info.artist_name} onChange={e => setSi('artist_name', e.target.value)} placeholder="e.g. Band / DJ name" />
              </div>
              <div>
                <label className={lbl}>Artist Number</label>
                <input className={inp} value={form.sound_info.artist_phone} onChange={e => setSi('artist_phone', e.target.value)} placeholder="e.g. 0790000000" />
              </div>
              <div className="col-span-2">
                <label className={lbl}>Artist Email</label>
                <input type="email" className={inp} value={form.sound_info.artist_email} onChange={e => setSi('artist_email', e.target.value)} placeholder="e.g. artist@example.com" />
              </div>
            </div>
            <div>
              <label className={lbl}>Technical Rider (auto-filled from quotation)</label>
              <textarea className={inp} rows={3} value={form.sound_info.technical_rider} onChange={e => setSi('technical_rider', e.target.value)} placeholder={'e.g. 1× X32 mixer\n4× SM58'} />
            </div>
          </div>

          {/* Notes */}
          <div className={sec}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</p>
            <textarea className={inp} rows={3} value={form.logistics_info.notes} onChange={e => setLi('notes', e.target.value)} placeholder="Access codes, parking, special instructions…" />
          </div>

          {/* Additional Attendees */}
          <div className={sec}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
              <Users size={11} /> Additional Attendees
            </p>
            <div>
              <label className={lbl}>Extra emails for the ops event (comma-separated)</label>
              <input
                className={inp}
                value={form.additional_attendees}
                onChange={e => set('additional_attendees', e.target.value)}
                placeholder="e.g. guest@example.com, tech@venue.com"
              />
              <p className="text-xs text-gray-400 mt-1">
                Finance and partner always receive the finance event.
              </p>
            </div>
            <div>
              <label className={lbl}>Arabic message number(s) (comma-separated, local format)</label>
              <input
                className={inp}
                value={form.whatsapp_arabic_recipients}
                onChange={e => set('whatsapp_arabic_recipients', e.target.value)}
                placeholder="e.g. 0799123456, 0791987654"
              />
              <p className="text-xs text-gray-400 mt-1">
                These numbers receive the Arabic WhatsApp notification only.
              </p>
            </div>
            <div>
              <label className={lbl}>English message number(s) (comma-separated, local format)</label>
              <input
                className={inp}
                value={form.whatsapp_english_recipients}
                onChange={e => set('whatsapp_english_recipients', e.target.value)}
                placeholder="e.g. 0799123456, 0791987654"
              />
              <p className="text-xs text-gray-400 mt-1">
                These numbers receive the English WhatsApp notification only.
              </p>
            </div>
            <div>
              <label className={lbl}>Country Code (applied to all numbers above)</label>
              <input
                className={inp}
                value={form.country_code}
                onChange={e => set('country_code', e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 962"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handleCancelRental}
                className="px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors"
              >
                Cancel Rental
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-xl text-sm hover:bg-gray-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {submitting
                ? <><Loader size={13} className="animate-spin" /> Saving…</>
                : <><RefreshCw size={13} /> {isEdit ? 'Save & Resync Calendar' : 'Book & Sync Calendar'}</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
