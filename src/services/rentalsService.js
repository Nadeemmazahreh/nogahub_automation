/**
 * Rentals Service
 * CRUD for v1_rentals + Google Calendar sync via the rentals-calendar-sync Edge Function.
 * Imported by: RentalCalendar.jsx, RentalForm.jsx, RentalsFinancials.jsx
 */

import { supabase, Tables } from '../lib/supabase';

const rentalsService = {
  /** All rentals with joined quotation name/total. */
  async listRentals() {
    const { data, error } = await supabase
      .from(Tables.RENTALS)
      .select('*, quotation:rental_quotation_id(project_name, client_name, total, calculation_results)')
      .order('start_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /**
   * Rentals whose start_at falls in a calendar month.
   * @param {number} year
   * @param {number} month  1-based
   */
  async getRentalsForMonth(year, month) {
    const start = new Date(year, month - 1, 1).toISOString();
    const end = new Date(year, month, 1).toISOString();
    const { data, error } = await supabase
      .from(Tables.RENTALS)
      .select('*, quotation:rental_quotation_id(project_name, client_name, total)')
      .gte('start_at', start)
      .lt('start_at', end)
      .neq('status', 'cancelled')
      .order('start_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  /** Rental quotation list for the booking form dropdown (rental-specific quotes only). */
  async listQuotations() {
    const { data, error } = await supabase
      .from(Tables.RENTALS_QUOTATIONS)
      .select('id, project_name, client_name, total, custom_equipment, technical_rider')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  /** Insert a rental row. Returns the new row. Does NOT sync calendar yet. */
  async createRental(rentalData) {
    // Use rental_quotation_id for new bookings; quotation_id is legacy (nullable now).
    const payload = { ...rentalData };
    if (payload.quotation_id && !payload.rental_quotation_id) {
      payload.rental_quotation_id = payload.quotation_id;
      delete payload.quotation_id;
    }
    const { data, error } = await supabase
      .from(Tables.RENTALS)
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /** Update rental operational fields. Resets sync_status to 'pending'. */
  async updateRental(id, updates) {
    const payload = { ...updates, sync_status: 'pending' };
    if (payload.quotation_id && !payload.rental_quotation_id) {
      payload.rental_quotation_id = payload.quotation_id;
      delete payload.quotation_id;
    }
    const { data, error } = await supabase
      .from(Tables.RENTALS)
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  /**
   * Trigger Edge Function to create/patch Google Calendar events.
   * Idempotent: patches if gcal_*_event_id already exist.
   * @param {string} rentalId
   * @param {'sync'|'cancel'} action
   */
  async syncCalendar(rentalId, action = 'sync') {
    const { data, error } = await supabase.functions.invoke('rentals-calendar-sync', {
      body: { rental_id: rentalId, action },
    });
    if (error) throw error;
    return data;
  },

  /** Manual resync (Resync button). */
  async resyncRental(id) {
    return this.syncCalendar(id, 'sync');
  },

  /** Confirm a pending rental: marks it booked, then syncs calendar + sends notifications. */
  async confirmRental(id) {
    const { error } = await supabase
      .from(Tables.RENTALS)
      .update({ status: 'booked' })
      .eq('id', id);
    if (error) throw error;
    let syncResult = null;
    try {
      syncResult = await this.syncCalendar(id, 'sync');
    } catch (e) {
      console.error('Calendar sync failed (rental confirmed):', e);
      syncResult = { error: e.message };
    }
    return syncResult;
  },

  /** Cancel: deletes calendar events and marks rental cancelled. */
  async cancelRental(id) {
    return this.syncCalendar(id, 'cancel');
  },

  /**
   * Revenue aggregated by month for the Financials module.
   * Returns [{month: 'YYYY-MM', rentals: [...], totalRevenue, totalVatToRemit}, ...]
   */
  async getRevenueByMonth() {
    const { data, error } = await supabase
      .from(Tables.RENTALS)
      .select('id, start_at, status, title, client_name, quotation:rental_quotation_id(project_name, client_name, total, calculation_results)')
      .eq('status', 'booked')
      .order('start_at', { ascending: false });
    if (error) throw error;

    const byMonth = {};
    for (const r of data || []) {
      const d = new Date(r.start_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byMonth[key]) byMonth[key] = { month: key, rentals: [], totalRevenue: 0, totalVatToRemit: 0 };
      byMonth[key].rentals.push(r);
      byMonth[key].totalRevenue += Number(r.quotation?.total || 0);
      byMonth[key].totalVatToRemit += Number(r.quotation?.calculation_results?.vatToRemitJOD || 0);
    }
    return Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
  },

  /** Check if a Google account is connected for calendar sync. */
  async getGoogleStatus() {
    const { data, error } = await supabase.functions.invoke('google-oauth-status');
    if (error) return { connected: false };
    return data || { connected: false };
  },

  /** Build the Google OAuth consent URL. */
  getGoogleConnectUrl() {
    const clientId = process.env.REACT_APP_GOOGLE_OAUTH_CLIENT_ID;
    const redirectUri = process.env.REACT_APP_GOOGLE_OAUTH_REDIRECT_URI;
    if (!clientId || !redirectUri) return null;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar.events openid email',
      access_type: 'offline',
      prompt: 'consent',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  },
};

export default rentalsService;
