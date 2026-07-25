'use client';

/**
 * Bookings list — M3.
 *
 * Three tabs (Upcoming / Active / Past) mirroring mobile
 * `(tabs)/bookings.tsx`. Each tab maps to a different `statuses[]` set:
 *   - Upcoming: PENDING, CONFIRMED
 *   - Active  : PROVIDER_EN_ROUTE, PROVIDER_ARRIVED, IN_PROGRESS
 *   - Past    : COMPLETED, CANCELLED, NO_SHOW, DISPUTED
 *
 * The list polls every 30s via `useBookings`. Search is client-side over
 * booking ref + customer name + service.
 */

import { useMemo, useState } from 'react';
import { Search, CalendarCheck } from 'lucide-react';
import { useBookings, type BookingStatus } from '@/lib/business-api/bookings';
import { useBookingsRealtime } from '@/lib/business-sockets';
import { BookingCard } from '@/components/business/bookings/BookingCard';
import { getBookingCustomerName, getServiceName } from '@/lib/business-format';

type TabKey = 'upcoming' | 'active' | 'past';

const TAB_STATUSES: Record<TabKey, BookingStatus[]> = {
  upcoming: ['PENDING', 'CONFIRMED'],
  active: ['PROVIDER_EN_ROUTE', 'PROVIDER_ARRIVED', 'IN_PROGRESS'],
  past: ['COMPLETED', 'CANCELLED', 'NO_SHOW', 'DISPUTED'],
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'active', label: 'Active' },
  { key: 'past', label: 'Past' },
];

export default function BookingsListPage() {
  const [tab, setTab] = useState<TabKey>('upcoming');
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useBookings({
    statuses: TAB_STATUSES[tab],
  });
  useBookingsRealtime({ onChange: refetch });

  const bookings = data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => {
      const inRef = b.bookingRef?.toLowerCase().includes(q);
      const inCustomer = getBookingCustomerName(b).toLowerCase().includes(q);
      const inService = getServiceName(b).toLowerCase().includes(q);
      return inRef || inCustomer || inService;
    });
  }, [bookings, search]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Bookings</h1>
        <p className="text-sm text-gray-500">
          Confirm requests, track live appointments, review completed jobs.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition -mb-px border-b-2 ${
              tab === t.key
                ? 'border-ruby-red text-ruby-red'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ref, customer, or service…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 bg-gray-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red focus:border-transparent text-sm"
          />
        </div>
      </div>

      {/* List */}
      {isLoading && bookings.length === 0 && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <div className="skeleton h-4 w-1/3 mb-2 rounded" />
              <div className="skeleton h-3 w-1/4 mb-3 rounded" />
              <div className="skeleton h-3 w-1/2 rounded" />
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-sm text-rose-900">
          Couldn&apos;t load bookings. {error}
        </div>
      )}

      {!isLoading && !error && filtered.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center">
            <CalendarCheck size={20} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {search
              ? 'No bookings match your search'
              : tab === 'upcoming'
              ? 'No upcoming bookings'
              : tab === 'active'
              ? 'No bookings in progress'
              : 'No past bookings yet'}
          </p>
          <p className="text-xs text-gray-500">
            {tab === 'upcoming'
              ? 'New reservations from your service listings will appear here first.'
              : tab === 'active'
              ? 'Bookings that are currently being fulfilled show up here.'
              : 'Completed, cancelled, and disputed bookings live here.'}
          </p>
        </div>
      )}

      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((b) => (
            <BookingCard key={b._id} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}
