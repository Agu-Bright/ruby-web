'use client';

/**
 * Booking detail — M3.
 *
 * Same shape as order detail: header + progress-ish status pill +
 * action bar based on status + customer/service/schedule/address/notes
 * + fee breakdown + status timeline.
 *
 * Action set (mirrors mobile `app/(main)/booking/[id].tsx`):
 *   - PENDING → Confirm | Cancel (with reason)
 *   - CONFIRMED → Start (→ IN_PROGRESS if ON_SITE, → PROVIDER_EN_ROUTE if AT_HOME) | Cancel | Reschedule
 *   - PROVIDER_EN_ROUTE → Arrived (→ PROVIDER_ARRIVED)
 *   - PROVIDER_ARRIVED → Start service (→ IN_PROGRESS)
 *   - IN_PROGRESS → Complete
 *   - COMPLETED/CANCELLED/DISPUTED/NO_SHOW → terminal
 *
 * Live location broadcast for AT_HOME bookings (professional en route to
 * customer) lands in M3-stretch alongside the shared Leaflet setup.
 */

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  X,
  Phone,
  MapPin,
  Home,
  Calendar,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import {
  useBookingDetail,
  useConfirmBooking,
  useUpdateBookingStatus,
  useCancelBooking,
  useRescheduleBooking,
  type BookingStatus,
} from '@/lib/business-api/bookings';
import { useBookingsRealtime } from '@/lib/business-sockets';
import { AtHomeTrackingMap } from '@/components/business/bookings/AtHomeTrackingMap';
import {
  getBookingCustomerName,
  getBookingCustomerPhone,
  getServiceName,
  getBookingSchedule,
  getBookingDuration,
  getBookingTotal,
  getServicePrice,
  formatCurrency,
  formatDateTime,
  timeAgo,
} from '@/lib/business-format';

function nextActions(
  status: BookingStatus,
  fulfillmentMode: 'ON_SITE' | 'AT_HOME' | 'BOTH' | undefined,
): { label: string; next: BookingStatus }[] {
  switch (status) {
    case 'CONFIRMED':
      return fulfillmentMode === 'AT_HOME'
        ? [{ label: 'I’m on the way', next: 'PROVIDER_EN_ROUTE' }]
        : [{ label: 'Start service', next: 'IN_PROGRESS' }];
    case 'PROVIDER_EN_ROUTE':
      return [{ label: 'I’ve arrived', next: 'PROVIDER_ARRIVED' }];
    case 'PROVIDER_ARRIVED':
      return [{ label: 'Start service', next: 'IN_PROGRESS' }];
    case 'IN_PROGRESS':
      return [{ label: 'Complete', next: 'COMPLETED' }];
    default:
      return [];
  }
}

const STATUS_TINT: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  PROVIDER_EN_ROUTE: 'bg-purple-100 text-purple-800',
  PROVIDER_ARRIVED: 'bg-purple-100 text-purple-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
  NO_SHOW: 'bg-rose-100 text-rose-800',
  DISPUTED: 'bg-rose-100 text-rose-800',
};

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const bookingId = params?.id ?? '';

  const { data: booking, isLoading, error, refetch } = useBookingDetail(bookingId);
  useBookingsRealtime({ onChange: refetch, id: bookingId });
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleReason, setRescheduleReason] = useState('');

  const confirm = useConfirmBooking(() => {
    toast.success('Booking confirmed.');
    refetch();
  });
  const updateStatus = useUpdateBookingStatus(() => {
    toast.success('Status updated.');
    refetch();
  });
  const cancel = useCancelBooking(() => {
    toast.success('Booking cancelled.');
    setShowReject(false);
    setRejectReason('');
    refetch();
  });
  const reschedule = useRescheduleBooking(() => {
    toast.success('Rescheduled — the customer has been notified.');
    setShowReschedule(false);
    setRescheduleDate('');
    setRescheduleTime('');
    setRescheduleReason('');
    refetch();
  });

  if (isLoading && !booking) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="skeleton h-8 w-1/3 mb-2 rounded" />
        <div className="skeleton h-4 w-1/4 mb-6 rounded" />
        <div className="skeleton h-40 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !booking) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft size={14} /> Back
        </button>
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-sm text-rose-900">
          {error ?? "This booking isn't available."}
        </div>
      </div>
    );
  }

  const customerName = getBookingCustomerName(booking);
  const customerPhone = getBookingCustomerPhone(booking);
  const serviceName = getServiceName(booking);
  const schedule = getBookingSchedule(booking);
  const duration = getBookingDuration(booking);
  const total = getBookingTotal(booking);
  const fulfillmentMode = booking.fulfillmentMode;
  const tint = STATUS_TINT[booking.status] ?? 'bg-gray-100 text-gray-700';

  const isTerminal =
    booking.status === 'COMPLETED' ||
    booking.status === 'CANCELLED' ||
    booking.status === 'NO_SHOW' ||
    booking.status === 'DISPUTED';
  const isPending = booking.status === 'PENDING';
  const actions = nextActions(booking.status, fulfillmentMode);
  const canCancel =
    !isTerminal &&
    (booking.status === 'PENDING' ||
      booking.status === 'CONFIRMED' ||
      booking.status === 'PROVIDER_EN_ROUTE' ||
      booking.status === 'PROVIDER_ARRIVED');
  const canReschedule =
    booking.status === 'PENDING' || booking.status === 'CONFIRMED';
  const busy =
    confirm.isLoading ||
    updateStatus.isLoading ||
    cancel.isLoading ||
    reschedule.isLoading;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={() => router.back()}
        className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-flex items-center gap-1"
      >
        <ArrowLeft size={14} /> Back to bookings
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">
              {booking.bookingRef}
            </h1>
            <span
              className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full ${tint}`}
            >
              {booking.status.replace(/_/g, ' ')}
            </span>
            {booking.riskTier && booking.riskTier !== 'LOW' && (
              <span
                className={`text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                  booking.riskTier === 'HIGH'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                <AlertTriangle size={12} />
                {booking.riskTier}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 flex items-center gap-1">
            <Clock size={14} />
            Placed {timeAgo(booking.createdAt)}
          </p>
        </div>
      </div>

      {/* Actions */}
      {!isTerminal && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          {/* Pending state — Confirm / Reject */}
          {isPending && !showReject && (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => confirm.mutate({ bookingId: booking._id })}
                className="flex-1 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Check size={16} />
                {confirm.isLoading ? 'Confirming…' : 'Confirm booking'}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setShowReject(true)}
                className="flex-1 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-semibold text-sm inline-flex items-center justify-center gap-2"
              >
                <X size={16} /> Reject
              </button>
            </div>
          )}

          {/* Non-pending status actions */}
          {!isPending && actions.length > 0 && !showReject && !showReschedule && (
            <div className="flex gap-2 flex-wrap">
              {actions.map((a) => (
                <button
                  key={a.next}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    updateStatus.mutate({
                      bookingId: booking._id,
                      status: a.next,
                    })
                  }
                  className="flex-1 min-w-[140px] py-2.5 rounded-lg bg-ruby-red hover:opacity-95 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {updateStatus.isLoading ? 'Working…' : a.label}
                </button>
              ))}
              {canReschedule && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowReschedule(true)}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Reschedule
                </button>
              )}
              {canCancel && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowReject(true)}
                  className="px-4 py-2.5 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 font-medium text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          )}

          {/* Cancel / reject reason */}
          {showReject && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder={
                  isPending
                    ? 'Tell the customer why you can’t take this booking…'
                    : 'Reason for cancelling…'
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red text-sm mb-3"
                disabled={busy}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !rejectReason.trim()}
                  onClick={() =>
                    cancel.mutate({
                      bookingId: booking._id,
                      reason: rejectReason.trim(),
                    })
                  }
                  className="flex-1 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {cancel.isLoading
                    ? 'Working…'
                    : isPending
                    ? 'Reject booking'
                    : 'Cancel booking'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowReject(false);
                    setRejectReason('');
                  }}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Reschedule form */}
          {showReschedule && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Propose new date and time
              </p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red text-sm"
                  disabled={busy}
                />
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red text-sm"
                  disabled={busy}
                />
              </div>
              <textarea
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={2}
                placeholder="Optional note to the customer…"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-ruby-red text-sm mb-3"
                disabled={busy}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy || !rescheduleDate || !rescheduleTime}
                  onClick={() =>
                    reschedule.mutate({
                      bookingId: booking._id,
                      bookingDate: rescheduleDate,
                      startTime: rescheduleTime,
                      reason: rescheduleReason.trim() || undefined,
                    })
                  }
                  className="flex-1 py-2.5 rounded-lg bg-ruby-red hover:opacity-95 text-white font-semibold text-sm disabled:opacity-60"
                >
                  {reschedule.isLoading ? 'Working…' : 'Send reschedule'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setShowReschedule(false);
                    setRescheduleDate('');
                    setRescheduleTime('');
                    setRescheduleReason('');
                  }}
                  className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Service + schedule */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Service
          </p>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {serviceName}
          </p>
          {booking.customDescription && booking.source === 'CHAT' && (
            <p className="text-xs text-gray-500 mb-3">
              Custom quote via chat
            </p>
          )}
          {booking.serviceSnapshot?.description && (
            <p className="text-xs text-gray-500 mb-3">
              {booking.serviceSnapshot.description}
            </p>
          )}

          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-sm text-gray-700">
            <p className="inline-flex items-center gap-2">
              <Calendar size={14} className="text-gray-400" /> {schedule}
            </p>
            {duration > 0 && (
              <p className="inline-flex items-center gap-2">
                <Clock size={14} className="text-gray-400" /> {duration} min
              </p>
            )}
            {fulfillmentMode && (
              <p className="inline-flex items-center gap-2">
                {fulfillmentMode === 'AT_HOME' ? (
                  <Home size={14} className="text-gray-400" />
                ) : (
                  <MapPin size={14} className="text-gray-400" />
                )}
                {fulfillmentMode === 'AT_HOME'
                  ? 'At customer’s location'
                  : fulfillmentMode === 'ON_SITE'
                  ? 'At your shop'
                  : 'Flexible location'}
              </p>
            )}
          </div>
        </div>

        {/* Customer */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Customer
          </p>
          <p className="text-sm font-medium text-gray-900 mb-1">
            {customerName}
          </p>
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="text-xs text-gray-500 hover:text-gray-700 inline-flex items-center gap-1"
            >
              <Phone size={12} /> {customerPhone}
            </a>
          )}
          {fulfillmentMode === 'AT_HOME' && booking.address && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Address
              </p>
              <p className="text-sm text-gray-900 flex items-start gap-2">
                <MapPin size={14} className="mt-0.5 shrink-0 text-gray-400" />
                <span>
                  {booking.address.street ?? booking.address.address ?? ''}
                  {booking.address.city && (
                    <>
                      <br />
                      {booking.address.city}
                      {booking.address.state && `, ${booking.address.state}`}
                    </>
                  )}
                </span>
              </p>
              {booking.travelQuote && (
                <p className="text-xs text-gray-500 mt-2">
                  ~{booking.travelQuote.distanceKm} km · ~
                  {booking.travelQuote.estimatedTravelMinutes} min travel
                </p>
              )}
            </div>
          )}
          {(booking.customerNote || booking.notes) && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                Note from customer
              </p>
              <p className="text-sm text-gray-700">
                {booking.customerNote ?? booking.notes}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fee breakdown */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Payment
        </p>
        <div className="space-y-1.5 text-sm">
          <Row
            label={booking.source === 'CHAT' ? 'Custom amount' : 'Service'}
            value={formatCurrency(
              booking.source === 'CHAT'
                ? booking.customAmount ?? 0
                : booking.feeBreakdown?.serviceFee ??
                    getServicePrice(booking.serviceSnapshot),
              booking.currency,
            )}
          />
          {(booking.feeBreakdown?.travelFee ?? 0) > 0 && (
            <Row
              label="Travel fee"
              value={formatCurrency(
                booking.feeBreakdown?.travelFee ?? 0,
                booking.currency,
              )}
            />
          )}
          {(booking.feeBreakdown?.deposit ?? 0) > 0 && (
            <Row
              label="Deposit"
              value={formatCurrency(
                booking.feeBreakdown?.deposit ?? 0,
                booking.currency,
              )}
            />
          )}
          {(booking.feeBreakdown?.discount ?? 0) > 0 && (
            <Row
              label="Discount"
              tint="green"
              value={`− ${formatCurrency(
                booking.feeBreakdown?.discount ?? 0,
                booking.currency,
              )}`}
            />
          )}
        </div>
        <div className="border-t border-gray-100 mt-3 pt-3">
          <Row
            bold
            label="Total"
            value={formatCurrency(total, booking.currency)}
          />
          {(booking.feeBreakdown?.balanceDue ?? 0) > 0 && (
            <Row
              label="Balance due"
              value={formatCurrency(
                booking.feeBreakdown?.balanceDue ?? 0,
                booking.currency,
              )}
            />
          )}
        </div>
        {booking.paymentStatus && (
          <p className="text-xs text-gray-500 mt-3">
            Payment {booking.paymentStatus.toLowerCase()}
            {booking.paymentMethod ? ` · ${booking.paymentMethod}` : ''}
          </p>
        )}
      </div>

      {/* Timeline */}
      {(booking.statusHistory ?? booking.statusTimeline)?.length ? (
        <div className="bg-white border border-gray-200 rounded-xl p-4 mt-4">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Status history
          </p>
          <ol className="space-y-2">
            {(booking.statusHistory ?? booking.statusTimeline ?? []).map(
              (entry, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {entry.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(entry.timestamp)}
                  </span>
                </li>
              ),
            )}
          </ol>
        </div>
      ) : null}

      {/* AT_HOME live route */}
      {fulfillmentMode === 'AT_HOME' &&
        (booking.status === 'PROVIDER_EN_ROUTE' ||
          booking.status === 'PROVIDER_ARRIVED') && (
          <AtHomeTrackingMap booking={booking} onRefresh={refetch} />
        )}
    </div>
  );
}

interface RowProps {
  label: string;
  value: string;
  bold?: boolean;
  tint?: 'green';
}
function Row({ label, value, bold, tint }: RowProps) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={`${
          bold ? 'text-sm font-semibold text-gray-900' : 'text-xs text-gray-500'
        }`}
      >
        {label}
      </span>
      <span
        className={`${bold ? 'text-base font-bold' : 'text-sm'} ${
          tint === 'green' ? 'text-green-700' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
