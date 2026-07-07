/**
 * RentalsFinancials — admin-only rentals revenue aggregate view.
 * Reuses recharts (already installed). No new dependencies.
 * Imported by: App.js (Rental section, admin-gated)
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, RefreshCw, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import rentalsService from '../../services/rentalsService';

export default function RentalsFinancials({ userRole }) {
  const [months, setMonths] = useState([]);
  const [allRentals, setAllRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [byMonth, all] = await Promise.all([
        rentalsService.getRevenueByMonth(),
        rentalsService.listRentals(),
      ]);
      setMonths(byMonth);
      setAllRentals(all);
    } catch (e) {
      toast.error(`Failed to load financials: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (userRole !== 'admin') {
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        Financials are visible to administrators only.
      </div>
    );
  }

  const totalRevenue = months.reduce((s, m) => s + m.totalRevenue, 0);
  const totalVat = months.reduce((s, m) => s + m.totalVatToRemit, 0);
  const totalBookings = allRentals.filter(r => r.status === 'booked').length;

  const chartData = [...months].reverse().map(m => ({
    label: m.month,
    revenue: parseFloat(m.totalRevenue.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">Rentals Financials</h2>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Admin Only</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gray-900 text-white rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Revenue (Booked)</p>
          <p className="text-2xl font-bold">{totalRevenue.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-0.5">JOD</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">VAT to Remit</p>
          <p className="text-2xl font-bold text-gray-900">{totalVat.toFixed(2)}</p>
          <p className="text-xs text-gray-400 mt-0.5">JOD</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">Active Bookings</p>
          <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
          <p className="text-xs text-gray-400 mt-0.5">rentals booked</p>
        </div>
      </div>

      {/* Revenue chart */}
      {chartData.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-gray-700 mb-4">Monthly Revenue (JOD)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={v => [`${v} JOD`, 'Revenue']} />
              <Bar dataKey="revenue" fill="#111827" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Month accordion */}
      {months.length === 0 && !loading && (
        <div className="py-12 text-center text-gray-400 text-sm">
          No booked rentals yet. Book rentals in the Calendar tab.
        </div>
      )}

      {months.map(m => (
        <div key={m.month} className="border border-gray-200 rounded-xl overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
            onClick={() => setExpanded(expanded === m.month ? null : m.month)}
          >
            <div className="flex items-center gap-3">
              <Calendar size={14} className="text-gray-500" />
              <span className="font-semibold text-gray-800">{m.month}</span>
              <span className="text-xs text-gray-400">{m.rentals.length} rental{m.rentals.length !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-700 font-medium">{m.totalRevenue.toFixed(2)} JOD</span>
              <span className="text-gray-500 text-xs">VAT {m.totalVatToRemit.toFixed(2)}</span>
              <span className="text-gray-400 text-xs">{expanded === m.month ? '▲' : '▼'}</span>
            </div>
          </button>

          {expanded === m.month && (
            <div className="divide-y divide-gray-100">
              {m.rentals.map(r => {
                const cr = r.quotation?.calculation_results || {};
                return (
                  <div key={r.id} className="px-5 py-3 flex flex-col sm:grid sm:grid-cols-12 gap-2 text-sm sm:items-center">
                    <div className="sm:col-span-5">
                      <p className="font-medium text-gray-900 truncate">{r.title || r.quotation?.project_name || '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{r.quotation?.client_name}</p>
                    </div>
                    <div className="sm:col-span-3 text-gray-500 text-xs">
                      {new Date(r.start_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                    </div>
                    <div className="sm:col-span-2 text-right">
                      <p className="font-semibold text-gray-900">{Number(r.quotation?.total || 0).toFixed(2)}</p>
                      <p className="text-xs text-gray-400">JOD</p>
                    </div>
                    <div className="sm:col-span-2 text-right">
                      {Number(cr.vatToRemitJOD) > 0 && (
                        <>
                          <p className="text-xs text-gray-700">{Number(cr.vatToRemitJOD).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">VAT</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="px-5 py-3 bg-gray-50 flex justify-end gap-8 text-sm font-semibold">
                <span className="text-gray-500">Month total</span>
                <span>{m.totalRevenue.toFixed(2)} JOD</span>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Cancelled rentals */}
      {allRentals.some(r => r.status === 'cancelled') && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-500">Cancelled Rentals</p>
          </div>
          <div className="divide-y divide-gray-50">
            {allRentals.filter(r => r.status === 'cancelled').map(r => (
              <div key={r.id} className="px-5 py-2.5 flex items-center justify-between text-sm opacity-60">
                <span className="text-gray-700">{r.title || r.quotation?.project_name || '—'}</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">cancelled</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
