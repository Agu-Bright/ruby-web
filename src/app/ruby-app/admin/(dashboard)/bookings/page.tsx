'use client';

import { useState, useRef, useEffect } from 'react';
import {
  CalendarCheck, Eye, Home, Building2, Clock, User, Search,
  CheckCircle2, XCircle, AlertTriangle, MoreHorizontal,
  ChevronDown, RefreshCw, MapPin, CreditCard, Ban,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/hooks';
import { api } from '@/lib/api';
import { DataTable, StatusBadge, Modal, type Column } from '@/components/ui';
import type { Booking, BookingFilterParams, BookingStatus, BookingStats } from '@/lib/types';
import { formatDate, formatDateTime, formatCurrency, formatRelativeTime, toLocationId } from '@/lib/utils';

const STATUS_OPTIONS: BookingStatus[] = ['PENDING', 'REQUESTED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];

// ============================================================
// Booking field helpers (backend ↔ frontend compat)
// ============================================================
function getBookingDate(b: Booking): string | undefined {
  return b.bookingDate || b.scheduledAt;
}

function getBusinessDisplay(b: Booking): string {
  if (typeof b.businessId === 'object' && b.businessId?.name) return b.businessId.name;
  return b.businessName || (typeof b.businessId === 'string' ? b.businessId.slice(-8) : '');
}

function getServiceDisplay(b: Booking): string {
  if (typeof b.serviceId === 'object' && b.serviceId?.name) return b.serviceId.name;
  if (b.serviceSnapshot?.name) return b.serviceSnapshot.name;
  return b.serviceName || 'Service';
}

function getCustomerDisplay(b: Booking): string {
  if (typeof b.userId === 'object' && b.userId !== null) {
    const u = b.userId as { fullName?: string; firstName?: string; lastName?: string; email?: string };
    return u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email || '';
  }
  return b.customerName || '';
}

function getCustomerEmail(b: Booking): string {
  if (typeof b.userId === 'object' && b.userId !== null) {
    return (b.userId as { email?: string }).email || '';
  }
  return '';
}

function getBookingTotal(b: Booking): number {
  return b.feeBreakdown?.total ?? b.total ?? 0;
}

function getBookingRef(b: Booking): string {
  return b.bookingRef || b.bookingNumber || b._id.slice(-8);
}

function getTimeline(b: Booking): { status: string; timestamp: string; note?: string }[] {
  return b.statusTimeline || b.statusHistory || [];
}

function getLocationDisplay(b: Booking): string {
  if (typeof b.locationId === 'object' && b.locationId?.name) return b.locationId.name;
  return '';
}

// ============================================================
// Stat Card Components
// ============================================================
const STAT_CARDS = [
  { key: 'total', label: 'Total Bookings', icon: CalendarCheck, bg: 'bg-violet-50', ring: 'ring-violet-100', color: 'text-violet-600', getValue: (s: BookingStats) => s.total },
  { key: 'pending', label: 'Pending', icon: Clock, bg: 'bg-amber-50', ring: 'ring-amber-100', color: 'text-amber-600', getValue: (s: BookingStats) => s.pending + (s.confirmed || 0) },
  { key: 'completed', label: 'Completed', icon: CheckCircle2, bg: 'bg-emerald-50', ring: 'ring-emerald-100', color: 'text-emerald-600', getValue: (s: BookingStats) => s.completed },
  { key: 'cancelled', label: 'Cancelled', icon: XCircle, bg: 'bg-red-50', ring: 'ring-red-100', color: 'text-red-600', getValue: (s: BookingStats) => s.cancelled + (s.noShow || 0) },
] as const;

export default function BookingsPage() {
  const { admin } = useAuth();
  const [filters, setFilters] = useState<BookingFilterParams>({
    page: 1,
    limit: 20,
    ...(admin?.scope === 'LOCATION' && admin.locationIds.length === 1 ? { locationId: toLocationId(admin.locationIds[0]) } : {}),
  });
  const [search, setSearch] = useState('');
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const { data: bookingStats, isLoading: statsLoading } = useApi<BookingStats>(
    () => api.bookings.stats(),
    []
  );

  const { data: bookings, meta, isLoading, refetch } = useApi<Booking[]>(
    () => api.bookings.list(filters),
    [filters]
  );

  const stats = bookingStats || { total: 0, pending: 0, confirmed: 0, inProgress: 0, completed: 0, cancelled: 0, noShow: 0, totalRevenue: 0, totalPlatformFee: 0 };

  const columns: Column<Booking>[] = [
    {
      key: 'booking',
      header: 'Booking',
      render: (b) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-50 to-violet-100 rounded-xl flex items-center justify-center ring-1 ring-violet-200/50">
            <CalendarCheck className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">#{getBookingRef(b)}</div>
            <div className="text-xs text-gray-500 mt-0.5 truncate max-w-[160px]">{getServiceDisplay(b)}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (b) => {
        const name = getCustomerDisplay(b);
        const email = getCustomerEmail(b);
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{name || '—'}</div>
            {email && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{email}</div>}
          </div>
        );
      },
    },
    {
      key: 'business',
      header: 'Business',
      render: (b) => (
        <div>
          <div className="text-sm text-gray-700">{getBusinessDisplay(b)}</div>
          {getLocationDisplay(b) && (
            <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" />{getLocationDisplay(b)}
            </div>
          )}
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
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-700">
          {b.fulfillmentMode === 'AT_HOME' ? (
            <><Home className="w-3 h-3" /> At Home</>
          ) : (
            <><Building2 className="w-3 h-3" /> On Site</>
          )}
        </span>
      ),
    },
    {
      key: 'schedule',
      header: 'Schedule',
      render: (b) => {
        const date = getBookingDate(b);
        return (
          <div className="text-sm text-gray-600">
            <div>{formatDate(date)}</div>
            {b.startTime && (
              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" />{b.startTime}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'total',
      header: 'Total',
      render: (b) => (
        <div>
          <span className="text-sm font-semibold text-gray-900">{formatCurrency(getBookingTotal(b), b.currency)}</span>
          {b.isPaid !== undefined && (
            <div className="mt-0.5">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${b.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {b.isPaid ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      className: 'w-12',
      render: (b) => (
        <button
          onClick={(e) => { e.stopPropagation(); setDetailBooking(b); }}
          className="p-1.5 rounded-lg hover:bg-violet-50 transition-colors"
        >
          <Eye className="w-4 h-4 text-gray-400 hover:text-violet-600" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-xl flex items-center justify-center shadow-sm">
            <CalendarCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
            <p className="text-sm text-gray-500">Monitor and manage service bookings</p>
          </div>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <div
            key={card.key}
            className="card p-5 hover:shadow-md transition-all duration-200 group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  {card.label}
                </p>
                <p className="mt-2.5 text-2xl font-bold text-gray-900">
                  {statsLoading ? (
                    <span className="inline-block skeleton h-7 w-12 rounded" />
                  ) : (
                    card.getValue(stats)
                  )}
                </p>
                {card.key === 'completed' && !statsLoading && stats.totalRevenue > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {formatCurrency(stats.totalRevenue)} revenue
                  </p>
                )}
                {card.key === 'pending' && !statsLoading && (stats.inProgress || 0) > 0 && (
                  <p className="mt-1 text-xs text-gray-400">
                    {stats.inProgress} in progress
                  </p>
                )}
              </div>
              <div className={`p-2.5 rounded-xl ${card.bg} ring-1 ${card.ring} group-hover:scale-110 transition-transform`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by ref, customer, or business..."
              className="input pl-10 bg-gray-50 w-full"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setFilters(f => ({ ...f, search: search || undefined, page: 1 }));
                }
              }}
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              className="input w-auto pr-8 bg-gray-50 appearance-none"
              value={filters.status || ''}
              onChange={(e) => setFilters(f => ({ ...f, status: (e.target.value || undefined) as BookingStatus | undefined, page: 1 }))}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Mode filter */}
          <div className="relative">
            <select
              className="input w-auto pr-8 bg-gray-50 appearance-none"
              value={filters.fulfillmentMode || ''}
              onChange={(e) => setFilters(f => ({ ...f, fulfillmentMode: (e.target.value || undefined) as 'ON_SITE' | 'AT_HOME' | undefined, page: 1 }))}
            >
              <option value="">All modes</option>
              <option value="ON_SITE">On Site</option>
              <option value="AT_HOME">At Home</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          </div>

          {/* Date range */}
          <input
            type="date"
            className="input w-auto bg-gray-50"
            value={filters.startDate || ''}
            onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value || undefined, page: 1 }))}
          />
          <input
            type="date"
            className="input w-auto bg-gray-50"
            value={filters.endDate || ''}
            onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value || undefined, page: 1 }))}
          />
        </div>

        {/* Active filter pills */}
        {(filters.status || filters.fulfillmentMode || filters.startDate || filters.search) && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
            <span className="text-xs text-gray-400">Active filters:</span>
            {filters.status && (
              <button
                onClick={() => setFilters(f => ({ ...f, status: undefined, page: 1 }))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-xs font-medium hover:bg-violet-100"
              >
                {filters.status.replace(/_/g, ' ')} <XCircle className="w-3 h-3" />
              </button>
            )}
            {filters.fulfillmentMode && (
              <button
                onClick={() => setFilters(f => ({ ...f, fulfillmentMode: undefined, page: 1 }))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
              >
                {filters.fulfillmentMode === 'AT_HOME' ? 'At Home' : 'On Site'} <XCircle className="w-3 h-3" />
              </button>
            )}
            {filters.startDate && (
              <button
                onClick={() => setFilters(f => ({ ...f, startDate: undefined, endDate: undefined, page: 1 }))}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
              >
                Date range <XCircle className="w-3 h-3" />
              </button>
            )}
            {filters.search && (
              <button
                onClick={() => { setSearch(''); setFilters(f => ({ ...f, search: undefined, page: 1 })); }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200"
              >
                &ldquo;{filters.search}&rdquo; <XCircle className="w-3 h-3" />
              </button>
            )}
            <button
              onClick={() => { setSearch(''); setFilters({ page: 1, limit: 20 }); }}
              className="text-xs text-gray-400 hover:text-gray-600 ml-1"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={bookings || []}
        meta={meta}
        isLoading={isLoading}
        emptyMessage="No bookings found"
        currentPage={filters.page}
        onPageChange={(page) => setFilters(f => ({ ...f, page }))}
        onRowClick={(b) => setDetailBooking(b)}
      />

      {/* Detail Modal */}
      <Modal isOpen={!!detailBooking} onClose={() => setDetailBooking(null)} title="Booking Details" size="lg">
        {detailBooking && <BookingDetailContent booking={detailBooking} />}
      </Modal>
    </div>
  );
}

// ============================================================
// Detail Modal Content
// ============================================================
function BookingDetailContent({ booking }: { booking: Booking }) {
  const timeline = getTimeline(booking);
  const fb = booking.feeBreakdown;
  const isActive = ['PENDING', 'REQUESTED', 'CONFIRMED', 'ARRIVED', 'IN_PROGRESS'].includes(booking.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-gray-900">#{getBookingRef(booking)}</h3>
            <StatusBadge status={booking.status} />
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Created {formatRelativeTime(booking.createdAt)}
            <span className="text-gray-300 mx-1.5">&middot;</span>
            {formatDateTime(booking.createdAt)}
          </p>
        </div>
        {booking.isPaid !== undefined && (
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
            booking.isPaid
              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
              : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
          }`}>
            <CreditCard className="w-3.5 h-3.5" />
            {booking.isPaid ? 'Paid' : 'Unpaid'}
          </div>
        )}
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-2 gap-3">
        <InfoCard label="Service" value={getServiceDisplay(booking)} icon={<CalendarCheck className="w-3.5 h-3.5 text-violet-500" />} />
        <InfoCard label="Business" value={getBusinessDisplay(booking)} icon={<Building2 className="w-3.5 h-3.5 text-blue-500" />} />
        <InfoCard label="Customer" value={getCustomerDisplay(booking) || '—'} sub={getCustomerEmail(booking)} icon={<User className="w-3.5 h-3.5 text-gray-500" />} />
        <InfoCard
          label="Mode"
          value={booking.fulfillmentMode === 'AT_HOME' ? 'At Home' : 'On Site'}
          icon={booking.fulfillmentMode === 'AT_HOME'
            ? <Home className="w-3.5 h-3.5 text-teal-500" />
            : <Building2 className="w-3.5 h-3.5 text-indigo-500" />
          }
        />
        <InfoCard
          label="Scheduled"
          value={formatDate(getBookingDate(booking))}
          sub={booking.startTime ? `at ${booking.startTime}` : undefined}
          icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
        />
        <InfoCard
          label="Duration"
          value={`${booking.durationMinutes || booking.duration || '—'} min`}
          sub={booking.timezone}
          icon={<Clock className="w-3.5 h-3.5 text-gray-500" />}
        />
      </div>

      {/* Location */}
      {getLocationDisplay(booking) && (
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
          <MapPin className="w-3.5 h-3.5" />
          <span>{getLocationDisplay(booking)}</span>
        </div>
      )}

      {/* Fee Breakdown */}
      {fb && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Fee Breakdown</h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            <FeeRow label="Service Fee" amount={fb.serviceFee} currency={booking.currency} />
            {fb.travelFee > 0 && <FeeRow label="Travel Fee" amount={fb.travelFee} currency={booking.currency} />}
            <FeeRow label="Platform Fee" amount={fb.platformFee} currency={booking.currency} />
            {fb.discount > 0 && <FeeRow label="Discount" amount={-fb.discount} currency={booking.currency} className="text-emerald-600" />}
            {fb.tax > 0 && <FeeRow label="Tax" amount={fb.tax} currency={booking.currency} />}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <FeeRow label="Total" amount={fb.total} currency={booking.currency} bold />
            </div>
            <div className="flex justify-between text-xs text-gray-400 pt-1">
              <span>Deposit: {formatCurrency(fb.deposit, booking.currency)}</span>
              <span>Paid: {formatCurrency(fb.amountPaid, booking.currency)}</span>
              <span className="font-medium text-gray-600">Due: {formatCurrency(fb.balanceDue, booking.currency)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Legacy fees fallback */}
      {!fb && booking.fees && booking.fees.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Fee Breakdown</h4>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
            {booking.fees.map((fee, i) => (
              <FeeRow key={i} label={fee.label} amount={fee.amount} currency={booking.currency} />
            ))}
            <div className="border-t border-gray-200 pt-2 mt-2">
              <FeeRow label="Total" amount={getBookingTotal(booking)} currency={booking.currency} bold />
            </div>
          </div>
        </div>
      )}

      {/* Service Address (AT_HOME) */}
      {booking.fulfillmentMode === 'AT_HOME' && booking.address && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Service Address</h4>
          <div className="bg-gray-50 rounded-xl p-4 text-sm flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-gray-700">{booking.address}</p>
          </div>
        </div>
      )}

      {/* Service Snapshot */}
      {booking.serviceSnapshot && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Service Details</h4>
          <div className="bg-gray-50 rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="font-medium text-gray-900">{booking.serviceSnapshot.name}</span>
              {booking.serviceSnapshot.basePrice != null && (
                <span className="font-semibold">{formatCurrency(booking.serviceSnapshot.basePrice, booking.currency)}</span>
              )}
            </div>
            {booking.serviceSnapshot.description && (
              <p className="text-gray-500 text-xs">{booking.serviceSnapshot.description}</p>
            )}
            {booking.serviceSnapshot.pricingType && (
              <span className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                {booking.serviceSnapshot.pricingType}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Timeline</h4>
          <div className="relative">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-violet-100" />
            <div className="space-y-4">
              {timeline.map((event, i) => (
                <div key={i} className="flex items-start gap-3 relative">
                  <div className={`mt-1 w-[14px] h-[14px] rounded-full border-2 flex items-center justify-center flex-shrink-0 z-10 ${
                    i === 0
                      ? 'border-violet-500 bg-violet-500'
                      : 'border-violet-200 bg-white'
                  }`}>
                    {i === 0 && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">
                        {event.status.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatRelativeTime(event.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(event.timestamp)}</p>
                    {event.note && (
                      <p className="text-xs text-gray-500 mt-1 bg-gray-50 rounded-lg px-2.5 py-1.5 inline-block">
                        {event.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================
function InfoCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-medium text-gray-900 text-sm">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function FeeRow({ label, amount, currency, bold, className }: { label: string; amount: number; currency: string; bold?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${bold ? 'font-semibold text-gray-900' : 'text-gray-600'} ${className || ''}`}>
      <span>{label}</span>
      <span>{amount < 0 ? '-' : ''}{formatCurrency(Math.abs(amount), currency)}</span>
    </div>
  );
}
