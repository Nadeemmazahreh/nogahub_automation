/**
 * RentalCalendar — month-grid calendar for rental bookings.
 * Click a day to open the RentalForm pre-filled with that date.
 * No external calendar library: plain React + date math.
 * Imported by: App.js (Rental section)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Calendar, Link2, CheckCircle, Pencil, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import rentalsService from '../../services/rentalsService';
import RentalForm from './RentalForm';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function RentalCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1); // 1-based
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editRental, setEditRental] = useState(null);
  const [googleStatus, setGoogleStatus] = useState({ connected: false, email: null });

  // Check Google connection on mount; handle ?google_connected=1 redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === '1') {
      toast.success('Google Calendar connected!');
      params.delete('google_connected');
      const newUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', newUrl);
    }
    if (params.get('google_error')) {
      toast.error(`Google connect failed: ${decodeURIComponent(params.get('google_error'))}`);
      params.delete('google_error');
      window.history.replaceState({}, '', window.location.pathname);
    }
    rentalsService.getGoogleStatus()
      .then(s => setGoogleStatus(s))
      .catch(() => {});
  }, []);

  const loadMonth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rentalsService.getRentalsForMonth(viewYear, viewMonth);
      setRentals(data);
    } catch (e) {
      toast.error(`Failed to load rentals: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, [viewYear, viewMonth]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  // Build calendar grid cells
  const firstDay = new Date(viewYear, viewMonth - 1, 1);
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate();
  const startOffset = firstDay.getDay(); // 0=Sun

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth - 1, d));

  // Map day-of-month → rentals on that day
  const rentalsByDay = {};
  for (const r of rentals) {
    const d = new Date(r.start_at);
    const key = d.getDate();
    if (!rentalsByDay[key]) rentalsByDay[key] = [];
    rentalsByDay[key].push(r);
  }

  function openCreate(date) {
    setSelectedDate(date);
    setEditRental(null);
    setFormOpen(true);
  }

  function openEdit(rental, e) {
    e.stopPropagation();
    setEditRental(rental);
    setSelectedDate(new Date(rental.start_at));
    setFormOpen(true);
  }

  async function handleConfirm(rental, e) {
    e.stopPropagation();
    try {
      const syncResult = await rentalsService.confirmRental(rental.id);
      if (syncResult?.error) {
        toast.success('Confirmed — calendar sync failed. Use Resync.');
      } else {
        toast.success('Rental confirmed — calendar synced & notifications sent!');
      }
      loadMonth();
    } catch (err) {
      toast.error(`Confirm failed: ${err.message}`);
    }
  }

  async function handleResync(rental, e) {
    e.stopPropagation();
    try {
      await rentalsService.resyncRental(rental.id);
      toast.success('Calendar synced');
      loadMonth();
    } catch (err) {
      toast.error(`Sync failed: ${err.message}`);
    }
  }

  async function handleCancel(rental, e) {
    e.stopPropagation();
    if (!window.confirm('Cancel this rental? Google Calendar events will be deleted.')) return;
    try {
      await rentalsService.cancelRental(rental.id);
      toast.success('Rental cancelled and calendar events removed');
      loadMonth();
    } catch (err) {
      toast.error(`Cancel failed: ${err.message}`);
    }
  }

  function handleFormSaved() {
    setFormOpen(false);
    loadMonth();
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar size={20} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Rental Calendar</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <span className="font-semibold text-gray-800 min-w-[160px] text-center">
            {MONTHS[viewMonth - 1]} {viewYear}
          </span>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          {googleStatus.connected ? (
            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg font-medium">
              <CheckCircle size={13} /> Connected as {googleStatus.email}
            </span>
          ) : (
            <button
              onClick={() => {
                const url = rentalsService.getGoogleConnectUrl();
                if (!url) { toast.error('Google OAuth not configured — set REACT_APP_GOOGLE_OAUTH_CLIENT_ID and REACT_APP_GOOGLE_OAUTH_REDIRECT_URI in .env'); return; }
                window.location.href = url;
              }}
              className="flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Link2 size={14} /> Connect Google Calendar
            </button>
          )}
          <button
            onClick={() => openCreate(today)}
            className="flex items-center gap-1 px-3 py-2 bg-black text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={14} /> New Rental
          </button>
        </div>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-t-xl overflow-hidden">
        {DAYS.map(d => (
          <div key={d} className="bg-gray-50 text-center text-xs font-semibold text-gray-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
      ) : (
        <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-b-xl overflow-hidden">
          {cells.map((date, idx) => {
            if (!date) return <div key={`e-${idx}`} className="bg-white min-h-[90px]" />;
            const dayRentals = rentalsByDay[date.getDate()] || [];
            const isToday = isSameDay(date, today);
            return (
              <div
                key={date.getDate()}
                onClick={() => openCreate(date)}
                className={`bg-white min-h-[90px] p-1.5 cursor-pointer hover:bg-gray-50 transition-colors ${isToday ? 'ring-2 ring-inset ring-black' : ''}`}
              >
                <span className={`text-xs font-semibold inline-flex items-center justify-center w-5 h-5 ${isToday ? 'bg-black text-white rounded-full' : 'text-gray-700'}`}>
                  {date.getDate()}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {dayRentals.map(r => (
                    <div
                      key={r.id}
                      onClick={(e) => openEdit(r, e)}
                      title={r.title || r.client_name}
                      className={`text-xs px-1 py-0.5 rounded truncate cursor-pointer flex items-center justify-between gap-0.5 ${
                        r.sync_status === 'failed' ? 'bg-red-100 text-red-800' :
                        r.sync_status === 'synced' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      <span className="truncate">{r.title || r.quotation?.client_name || 'Rental'}</span>
                      {r.sync_status === 'failed' && (
                        <button onClick={(e) => handleResync(r, e)} title="Resync" className="shrink-0">
                          <RefreshCw size={9} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-200 inline-block" /> Synced to calendar</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-200 inline-block" /> Sync pending</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" /> Sync failed (↺ to retry)</span>
      </div>

      {/* This-month rental list */}
      {rentals.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
          <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
            <p className="text-sm font-semibold text-gray-700">
              {MONTHS[viewMonth - 1]} — {rentals.length} rental{rentals.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-100">
            {rentals.map(r => (
              <div
                key={r.id}
                onClick={() => { setEditRental(r); setSelectedDate(new Date(r.start_at)); setFormOpen(true); }}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{r.title || r.quotation?.client_name || 'Rental'}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(r.start_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                    {' → '}
                    {new Date(r.end_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  {r.venue && <p className="text-xs text-gray-400">{r.venue}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    r.status === 'booked' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {r.status === 'booked' ? 'Confirmed' : 'Pending'}
                  </span>
                  {r.status === 'pending' && (
                    <button
                      onClick={(e) => handleConfirm(r, e)}
                      className="text-gray-400 hover:text-green-600 transition-colors"
                      title="Confirm: sync calendar & send notifications"
                    >
                      <CheckCircle size={13} />
                    </button>
                  )}
                  {r.status === 'booked' && r.sync_status !== 'synced' && (
                    <button
                      onClick={async (e) => { e.stopPropagation(); await handleResync(r, e); }}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="Resync to Google Calendar"
                    >
                      <RefreshCw size={13} />
                    </button>
                  )}
                  <button
                    onClick={(e) => openEdit(r, e)}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                    title="Edit rental"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => handleCancel(r, e)}
                    className="text-gray-400 hover:text-red-600 transition-colors"
                    title="Cancel rental"
                  >
                    <Ban size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {formOpen && (
        <RentalForm
          initialDate={selectedDate}
          rental={editRental}
          onSaved={handleFormSaved}
          onClose={() => setFormOpen(false)}
        />
      )}
    </div>
  );
}
