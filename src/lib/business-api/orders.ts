'use client';

/**
 * Orders hooks — mirror of mobile `useOrders.ts`.
 *
 * Every mobile hook has a matching web hook here so downstream milestones
 * (M6 wallet linking to source orders, M11 notification deep-links,
 * M2's own delivery-tracking screen) don't strand callers.
 *
 * The `BusinessOrder` type keeps both nested (`fees.total`) and flat
 * (`subtotal`, `total`) shapes optional — same reason as the mobile
 * type: backend has evolved field names + the format helpers pick with
 * `??` fallback. See `docs/business-web-port/PLAN.md` on backend↔frontend
 * field mismatches.
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

// ─── Types (mobile-parity) ─────────────────────────────────────────────
export type OrderStatus =
  | 'PLACED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PREPARING'
  | 'READY'
  | 'DISPATCHED'
  | 'PICKED_UP'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItem {
  productId?: string;
  name?: string;
  productName?: string; // legacy alias
  quantity: number;
  unitPrice?: number;
  basePrice?: number; // legacy alias
  subtotal?: number;
  lineTotal?: number; // legacy alias
  specialInstructions?: string;
  notes?: string; // legacy alias
  variations?: Array<{ name: string; option: string }>;
  variationName?: string; // legacy flattened form
  media?: Array<{ url: string }>;
}

export interface StatusTimelineEntry {
  status: OrderStatus;
  timestamp: string;
  updatedBy?: string;
}

export interface OrderFees {
  subtotal?: number;
  deliveryFee?: number;
  serviceFee?: number;
  platformFee?: number;
  vat?: number;
  vatRate?: number;
  discount?: number;
  tip?: number;
  total?: number;
  commissionRate?: number;
}

export interface DeliveryAddress {
  street?: string;
  address?: string; // legacy
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  lat?: number; // legacy
  lng?: number; // legacy
  instructions?: string;
}

export interface BusinessOrder {
  _id: string;
  orderNumber: string;
  userId:
    | string
    | {
        _id: string;
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
      };
  businessId: string;
  items: OrderItem[];
  // Nested vs flat — helpers in business-format.ts pick with ??
  fees?: OrderFees;
  subtotal?: number;
  deliveryFee?: number;
  platformFee?: number;
  discount?: number;
  total?: number;
  currency?: string;
  type?: 'PICKUP' | 'DELIVERY';
  fulfillmentType?: 'PICKUP' | 'DELIVERY'; // legacy alias
  deliveryAddress?: DeliveryAddress;
  status: OrderStatus;
  statusHistory?: StatusTimelineEntry[];
  statusTimeline?: StatusTimelineEntry[]; // legacy alias
  paymentMethod?: string;
  paymentStatus?: string;
  customerNote?: string;
  notes?: string; // legacy alias
  businessNote?: string;
  cancellationReason?: string;
  rejectionReason?: string;
  cancelledBy?: 'USER' | 'BUSINESS' | 'SYSTEM';
  estimatedPrepTime?: number;
  estimatedDeliveryTime?: string;
  actualDeliveryTime?: string;
  deliveryJobId?: string;
  deliveryQuoteId?: string;
  locationId?: string;
  pickupTime?: string;
  businessSnapshot?: { name?: string; phone?: string; address?: string };
  createdAt: string;
  updatedAt?: string;
}

// ─── Queries ───────────────────────────────────────────────────────────
export function useOrders(status?: string, page = 1, limit = 20) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () =>
      api.businessOrders.list({
        businessId,
        page,
        limit,
        status,
      }),
    [businessId, status, page, limit],
  );
  return useBusinessQuery(fetcher, [businessId, status, page, limit], {
    enabled: !!businessId,
  });
}

export function useRecentOrders(limit = 10) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessOrders.recent(businessId, limit),
    [businessId, limit],
  );
  return useBusinessQuery(fetcher, [businessId, limit], {
    enabled: !!businessId,
  });
}

export function usePendingOrdersCount() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessOrders.pendingCount(businessId),
    [businessId],
  );
  return useBusinessQuery(fetcher, [businessId], {
    enabled: !!businessId,
    pollMs: 30_000,
  });
}

export function useOrderDetail(orderId: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessOrders.detail(orderId, businessId),
    [orderId, businessId],
  );
  return useBusinessQuery(fetcher, [orderId, businessId], {
    enabled: !!businessId && !!orderId,
  });
}

export function useOrderStats(startDate?: string, endDate?: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessOrders.stats(businessId, startDate, endDate),
    [businessId, startDate, endDate],
  );
  return useBusinessQuery(fetcher, [businessId, startDate, endDate], {
    enabled: !!businessId,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────
export function useAcceptOrder(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<
    unknown,
    { orderId: string; estimatedPrepTime?: number }
  >(
    ({ orderId, estimatedPrepTime }) =>
      api.businessOrders.accept(
        orderId,
        business?._id ?? '',
        estimatedPrepTime,
      ),
    { onSuccess },
  );
}

export function useRejectOrder(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<unknown, { orderId: string; reason: string }>(
    ({ orderId, reason }) =>
      api.businessOrders.reject(orderId, business?._id ?? '', reason),
    { onSuccess },
  );
}

export function useUpdateOrderStatus(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<
    unknown,
    { orderId: string; status: OrderStatus }
  >(
    ({ orderId, status }) =>
      api.businessOrders.updateStatus(orderId, business?._id ?? '', status),
    { onSuccess },
  );
}

export function useCancelOrder(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<unknown, { orderId: string; reason: string }>(
    ({ orderId, reason }) =>
      api.businessOrders.cancel(orderId, business?._id ?? '', reason),
    { onSuccess },
  );
}
