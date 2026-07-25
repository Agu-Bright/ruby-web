'use client';

/**
 * BookingCard — row in the bookings list.
 * Web parity with mobile `BookingCard.tsx`.
 */

import Link from 'next/link';
import { Calendar, User, Home, MapPin, AlertTriangle } from 'lucide-react';
import type { BusinessBooking } from '@/lib/business-api/bookings';
import {
  getBookingCustomerName,
  getServiceName,
  getBookingTotal,
  getBookingSchedule,
  formatCurrency,
} from '@/lib/business-format';

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

export function BookingCard({ booking }: { booking: BusinessBooking }) {
  const customer = getBookingCustomerName(booking);
  const service = getServiceName(booking);
  const schedule = getBookingSchedule(booking);
  const total = getBookingTotal(booking);
  const tint = STATUS_TINT[booking.status] ?? 'bg-gray-100 text-gray-700';
  // Guard: undefined riskTier shouldn't render — mobile-parity bug we
  // hit before (memory `deolu_escalation…` / booking risk badge).
  const showRisk = booking.riskTier && booking.riskTier !== 'LOW';

  return (
    <Link
      href={`/business/dashboard/bookings/${booking._id}`}
      className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <p className="text-sm font-semibold text-gray-900">
            {booking.bookingRef}
          </p>
          <span
            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${tint}`}
          >
            {booking.status.replace(/_/g, ' ')}
          </span>
          {showRisk && (
            <span
              className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                booking.riskTier === 'HIGH'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <AlertTriangle size={10} />
              {booking.riskTier}
            </span>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-900 mb-1.5 truncate">{service}</p>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 mb-2">
        <span className="inline-flex items-center gap-1 truncate">
          <User size={12} />
          {customer}
        </span>
        <span className="inline-flex items-center gap-1 truncate">
          <Calendar size={12} />
          {schedule}
        </span>
        {booking.fulfillmentMode && (
          <span className="inline-flex items-center gap-1 truncate">
            {booking.fulfillmentMode === 'AT_HOME' ? (
              <Home size={12} />
            ) : (
              <MapPin size={12} />
            )}
            {booking.fulfillmentMode === 'AT_HOME'
              ? 'At customer'
              : booking.fulfillmentMode === 'ON_SITE'
              ? 'At shop'
              : 'Flexible'}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-2">
        <span className="text-[11px] text-gray-400">
          {booking.source === 'CHAT' ? 'Custom quote' : 'Catalog booking'}
        </span>
        <span className="text-sm font-bold text-gray-900">
          {formatCurrency(total, booking.currency ?? 'NGN')}
        </span>
      </div>
    </Link>
  );
}
