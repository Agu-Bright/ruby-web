'use client';

/**
 * Bookings hooks — mirror of mobile `useBookings.ts`.
 *
 * Booking = service reservation (spa, home cleaning, tailoring, etc.).
 * Distinct from Order (which is goods commerce). Both live under the
 * merchant's shop but have different lifecycles + surfaces.
 *
 * Two sources:
 *   - CATALOG: customer picked a service listing → payload has `serviceId`
 *              + `serviceSnapshot`
 *   - CHAT   : professional quoted a custom price mid-conversation →
 *              payload has `customAmount` + `customDescription` +
 *              `conversationId`
 *
 * The `BusinessBooking` type carries backward-compat aliased fields —
 * pricing on the serviceSnapshot lives at either `basePrice` (new) or
 * `price` (legacy). Business-format helpers handle these with `??`.
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

// ─── Types ─────────────────────────────────────────────────────────────
export type BookingStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROVIDER_EN_ROUTE'
  | 'PROVIDER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW'
  | 'DISPUTED';

export interface BookingFeeBreakdown {
  serviceFee?: number;
  travelFee?: number;
  platformFee?: number;
  discount?: number;
  deposit?: number;
  tax?: number;
  total?: number;
  amountPaid?: number;
  balanceDue?: number;
  commissionRate?: number;
}

export interface BookingServiceSnapshot {
  name?: string;
  description?: string;
  pricingType?: 'FIXED' | 'STARTS_FROM' | 'QUOTE_REQUIRED';
  basePrice?: number;
  price?: number; // legacy alias
  durationMinutes?: number; // legacy top-level fallback
}

export interface BookingAddress {
  street?: string;
  address?: string; // legacy alias
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}

export interface BusinessBooking {
  _id: string;
  bookingRef: string;
  userId:
    | string
    | {
        _id: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
        fullName?: string;
      };
  businessId: string | { _id: string; name: string; slug?: string };
  serviceId?: string | { _id: string; name: string; slug?: string };
  serviceSnapshot?: BookingServiceSnapshot;

  bookingDate?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  endTime?: string;
  durationMinutes?: number;
  timezone?: string;
  fulfillmentMode?: 'ON_SITE' | 'AT_HOME' | 'BOTH';

  // Chat-source
  source?: 'CATALOG' | 'CHAT';
  customAmount?: number;
  customDescription?: string;
  conversationId?: string;
  chatMessageId?: string;

  address?: BookingAddress;
  providerLastLocation?: { lat: number; lng: number; updatedAt?: string };
  travelQuote?: {
    distanceKm: number;
    travelFee: number;
    estimatedTravelMinutes: number;
    calculatedAt?: string;
  };

  feeBreakdown?: BookingFeeBreakdown;
  total?: number; // flat fallback
  currency?: string;

  status: BookingStatus;
  statusHistory?: {
    status: BookingStatus;
    timestamp: string;
    updatedBy?: string;
  }[];
  statusTimeline?: {
    status: BookingStatus;
    timestamp: string;
    updatedBy?: string;
  }[]; // legacy alias

  paymentMethod?: string;
  paymentStatus?: string;

  cancellationReason?: string;
  cancelledBy?: 'USER' | 'BUSINESS' | 'SYSTEM';

  customerNote?: string;
  businessNote?: string;
  notes?: string; // legacy alias

  riskTier?: 'LOW' | 'MEDIUM' | 'HIGH';

  createdAt: string;
  updatedAt?: string;
}

// ─── Queries ───────────────────────────────────────────────────────────
export function useBookings(params: {
  status?: string;
  statuses?: string[];
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  // Deps must be primitive for stable memoisation.
  const statusesKey = params.statuses?.join(',') ?? '';
  const fetcher = useCallback(
    () => api.businessBookings.list(params),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      businessId,
      params.status,
      statusesKey,
      params.page,
      params.limit,
      params.dateFrom,
      params.dateTo,
    ],
  );
  return useBusinessQuery(
    fetcher,
    [
      businessId,
      params.status,
      statusesKey,
      params.page,
      params.limit,
      params.dateFrom,
      params.dateTo,
    ],
    {
      enabled: !!businessId,
    },
  );
}

export function useBookingDetail(bookingId: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessBookings.detail(bookingId),
    [bookingId],
  );
  return useBusinessQuery(fetcher, [bookingId, businessId], {
    enabled: !!businessId && !!bookingId,
  });
}

export function useBookingStats(dateFrom?: string, dateTo?: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessBookings.stats(dateFrom, dateTo),
    [dateFrom, dateTo],
  );
  return useBusinessQuery(fetcher, [businessId, dateFrom, dateTo], {
    enabled: !!businessId,
  });
}

export function usePendingBookingsCount() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessBookings.getPendingCount(businessId),
    [businessId],
  );
  return useBusinessQuery(fetcher, [businessId], {
    enabled: !!businessId,
    pollMs: 30_000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────
export function useConfirmBooking(onSuccess?: () => void) {
  return useMutation<unknown, { bookingId: string; notes?: string }>(
    ({ bookingId, notes }) => api.businessBookings.confirm(bookingId, { notes }),
    { onSuccess },
  );
}

export function useUpdateBookingStatus(onSuccess?: () => void) {
  return useMutation<
    unknown,
    { bookingId: string; status: BookingStatus }
  >(
    ({ bookingId, status }) =>
      api.businessBookings.updateStatus(bookingId, status),
    { onSuccess },
  );
}

export function useCancelBooking(onSuccess?: () => void) {
  return useMutation<unknown, { bookingId: string; reason: string }>(
    ({ bookingId, reason }) => api.businessBookings.cancel(bookingId, reason),
    { onSuccess },
  );
}

export function useRescheduleBooking(onSuccess?: () => void) {
  return useMutation<
    unknown,
    {
      bookingId: string;
      bookingDate: string;
      startTime: string;
      reason?: string;
    }
  >(
    ({ bookingId, ...rest }) =>
      api.businessBookings.reschedule(bookingId, rest),
    { onSuccess },
  );
}

export function useSafetyCheckIn(onSuccess?: () => void) {
  return useMutation<unknown, {
    bookingId: string;
    eventType: string;
    location?: { lat: number; lng: number };
    notes?: string;
  }>(
    ({ bookingId, ...data }) => api.businessBookings.safetyCheckIn(bookingId, data),
    { onSuccess },
  );
}

export function useUpdateProviderLocation(onSuccess?: () => void) {
  return useMutation<unknown, { bookingId: string; lat: number; lng: number }>(
    ({ bookingId, lat, lng }) => api.businessBookings.updateProviderLocation(bookingId, { lat, lng }),
    { onSuccess },
  );
}

export function useCreateChatBooking(onSuccess?: () => void) {
  return useMutation<
    { booking: BusinessBooking; messageId: string },
    {
      conversationId: string;
      customAmount: number;
      customDescription: string;
      serviceListingId?: string;
      bookingDate?: string;
      startTime?: string;
    }
  >(
    (data) => api.businessBookings.chatCreate(data),
    { onSuccess },
  );
}
