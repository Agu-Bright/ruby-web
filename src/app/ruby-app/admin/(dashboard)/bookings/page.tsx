'use client';

import { useState } from 'react';
import { CalendarCheck, Eye, Home, Building2, Clock, User } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { PageHeader, DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Booking, BookingFilterParams, BookingStatus } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: BookingStatus[] = ['REQUESTED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

export default function BookingsPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<BookingFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
  });
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  const { data: bookings, meta, isLoading } = useApi<Booking[]>(
    () => api.bookings.list(filters),
    [filters]
  );

  const columns: Column<Booking>[] = [
    {
      key: 'booking',
      header: 'Booking',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-violet-50 rounded-lg flex items-center justify-center">
            <CalendarCheck className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <div className="font-medium text-gray-900">#{b._id.slice(-8)}</div>
            <div className="text-xs text-gray-500">{b.serviceName || 'Service'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <StatusBadge status={b.status} />,
    },
    {
      key: 'mode',
      header: 'Mode',
      render: (b) => (
        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100">
          {b.fulfillmentMode === 'AT_HOME' ? (
            <span className="flex items-center gap-1"><Home className="w-3 h-3" /> At Home</span>
          ) : (
            <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> On Site</span>
          )}
        </span>
      ),
    },
    {
      key: 'business',
      header: 'Business',
      render: (b) => <span className="text-sm text-gray-600">{b.businessName || b.businessId}</span>,
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (b) => (
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(b.scheduledAt)}</div>
        </div>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (b) => <span className="text-sm font-medium">{formatCurrency(b.total, b.currency)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'w-16',
      render: (b) => (
        <button onClick={(e) => { e.stopPropagation(); setDetailBooking(b); }} className="p-1.5 rounded hover:bg-gray-100">
          <Eye className="w-3.5 h-3.5 text-gray-500" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bookings"
        description="Monitor and track service bookings"
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={filters.status || ''}
          onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as BookingStatus | undefined, page: 1 }))}
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </select>
        <input
          type="date"
          className="input w-auto"
          value={filters.startDate || ''}
          onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined, page: 1 }))}
        />
        <input
          type="date"
          className="input w-auto"
          value={filters.endDate || ''}
          onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined, page: 1 }))}
        />
      </div>

      <DataTable
        columns={columns}
        data={bookings || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No bookings found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
      />

      {/* Detail Modal */}
      <Modal isOpen={!!detailBooking} onClose={() => setDetailBooking(null)} title="Booking Details" size="lg">
        {detailBooking && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Booking #{detailBooking._id.slice(-8)}</h3>
                <p className="text-sm text-gray-500">{formatDateTime(detailBooking.createdAt)}</p>
              </div>
              <StatusBadge status={detailBooking.status} />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Service</span>
                <p className="font-medium">{detailBooking.serviceName || 'Service Listing'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Business</span>
                <p className="font-medium">{detailBooking.businessName || detailBooking.businessId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Customer</span>
                <p className="font-medium flex items-center gap-1"><User className="w-3.5 h-3.5" /> {detailBooking.customerName || detailBooking.customerId}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Mode</span>
                <p className="font-medium">
                  {detailBooking.fulfillmentMode === 'AT_HOME' ? '🏠 At Home' : '🏢 On Site'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Scheduled</span>
                <p className="font-medium">{formatDate(detailBooking.scheduledAt)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500 uppercase">Duration</span>
                <p className="font-medium">{detailBooking.durationMinutes || '—'} min</p>
              </div>
            </div>

            {/* Fees */}
            {detailBooking.fees && detailBooking.fees.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Fee Breakdown</h4>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                  {detailBooking.fees.map((fee, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-gray-500">{fee.label}</span>
                      <span>{formatCurrency(fee.amount, detailBooking.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between font-semibold border-t border-gray-200 pt-1 mt-1">
                    <span>Total</span><span>{formatCurrency(detailBooking.total, detailBooking.currency)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Address for AT_HOME */}
            {detailBooking.fulfillmentMode === 'AT_HOME' && detailBooking.address && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Service Address</h4>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  <p>{detailBooking.address}</p>
                </div>
              </div>
            )}

            {/* Safety Events */}
            {detailBooking.safetyEvents && detailBooking.safetyEvents.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Safety Events</h4>
                <div className="space-y-2">
                  {detailBooking.safetyEvents.map((event, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-50" />
                      <div>
                        <span className="font-medium">{event.status}</span>
                        <span className="text-gray-500 ml-2">{formatDateTime(event.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status Timeline */}
            {detailBooking.statusHistory && detailBooking.statusHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Timeline</h4>
                <div className="space-y-3">
                  {detailBooking.statusHistory.map((event, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-violet-500 ring-4 ring-violet-50" />
                      <div>
                        <div className="text-sm font-medium">{event.status.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-gray-500">{formatDateTime(event.timestamp)}</div>
                        {event.note && <div className="text-xs text-gray-400 mt-0.5">{event.note}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
