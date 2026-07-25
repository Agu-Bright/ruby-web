'use client';

/**
 * Backend↔frontend field mismatch bridge — web port of mobile
 * `src/utils/format.ts` helpers.
 *
 * The backend schema uses different field names than the mobile/web
 * types on Order/Product/Service/etc. Rather than patch each call site
 * with `??` fallbacks (which we tried and it's brittle), every screen
 * that reads from these shapes goes through a helper here.
 *
 * When mobile ships a new helper, port it here too — this file mirrors
 * mobile 1:1 so a merchant switching between web + mobile sees the same
 * numbers on the same orders.
 *
 * See `docs/business-web-port/PLAN.md` § Cross-cutting patterns and
 * `~/.claude/…/memory/backend_frontend_field_mismatches.md`.
 */

import type {
  BusinessOrder,
  OrderItem,
  DeliveryAddress,
  StatusTimelineEntry,
} from '@/lib/business-api/orders';

// ─── Order total ───────────────────────────────────────────────────────
// Backend nests under `fees.total`; some responses flatten to `total`.
export function getOrderTotal(order: BusinessOrder | null | undefined): number {
  if (!order) return 0;
  return order.fees?.total ?? order.total ?? 0;
}

export function getOrderSubtotal(order: BusinessOrder | null | undefined): number {
  if (!order) return 0;
  return order.fees?.subtotal ?? order.subtotal ?? 0;
}

export function getOrderDeliveryFee(order: BusinessOrder | null | undefined): number {
  if (!order) return 0;
  return order.fees?.deliveryFee ?? order.deliveryFee ?? 0;
}

export function getOrderDiscount(order: BusinessOrder | null | undefined): number {
  if (!order) return 0;
  return order.fees?.discount ?? order.discount ?? 0;
}

// ─── Fulfilment (PICKUP / DELIVERY) ────────────────────────────────────
export function getFulfillmentType(
  order: BusinessOrder | null | undefined,
): 'PICKUP' | 'DELIVERY' | null {
  if (!order) return null;
  return order.fulfillmentType ?? order.type ?? null;
}

// ─── Status history — always returns oldest → newest ───────────────────
export function getStatusTimeline(
  order: BusinessOrder | null | undefined,
): StatusTimelineEntry[] {
  if (!order) return [];
  const list = order.statusTimeline ?? order.statusHistory ?? [];
  return [...list].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

// ─── Customer name ─────────────────────────────────────────────────────
// `userId` is a string ID on write, populated to a user object on read.
// Guard for `null` because `typeof null === 'object'` — a real crash class
// on this platform (see memory `backend_frontend_field_mismatches.md`).
export function getCustomerName(order: BusinessOrder | null | undefined): string {
  if (!order) return 'Customer';
  const u = order.userId;
  if (u && typeof u === 'object') {
    const full = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
    return full || 'Customer';
  }
  return 'Customer';
}

export function getCustomerPhone(
  order: BusinessOrder | null | undefined,
): string | null {
  if (!order) return null;
  const u = order.userId;
  if (u && typeof u === 'object') {
    return u.phone ?? null;
  }
  return null;
}

// ─── Item helpers ──────────────────────────────────────────────────────
export function getItemName(item: OrderItem | null | undefined): string {
  if (!item) return 'Item';
  return item.name ?? item.productName ?? 'Item';
}

export function getItemPrice(item: OrderItem | null | undefined): number {
  if (!item) return 0;
  return item.unitPrice ?? item.basePrice ?? 0;
}

export function getItemLineTotal(item: OrderItem | null | undefined): number {
  if (!item) return 0;
  return item.subtotal ?? item.lineTotal ?? getItemPrice(item) * (item.quantity ?? 0);
}

export function getItemNote(item: OrderItem | null | undefined): string {
  if (!item) return '';
  return item.specialInstructions ?? item.notes ?? '';
}

// ─── Address helpers ───────────────────────────────────────────────────
export function getDeliveryStreet(
  addr: DeliveryAddress | null | undefined,
): string {
  if (!addr) return '';
  return addr.street ?? addr.address ?? '';
}

export function getDeliveryCoords(
  addr: DeliveryAddress | null | undefined,
): { lat: number; lng: number } | null {
  if (!addr) return null;
  const lat = addr.latitude ?? addr.lat;
  const lng = addr.longitude ?? addr.lng;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;
  return { lat, lng };
}

// ─── Currency + date formatting ────────────────────────────────────────
export function formatCurrency(
  n: number | null | undefined,
  currency = 'NGN',
): string {
  if (n == null || Number.isNaN(n)) return currency === 'NGN' ? '₦—' : '—';
  const symbol = currency === 'NGN' ? '₦' : '';
  return `${symbol}${Math.round(n).toLocaleString('en-NG')}`;
}

export function timeAgo(iso: string | undefined | null): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-NG', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Booking helpers ───────────────────────────────────────────────────
// Kept in this same file so both the orders + bookings surfaces read
// through one bridge (mirrors mobile's single `format.ts`).

import type {
  BusinessBooking,
  BookingServiceSnapshot,
} from '@/lib/business-api/bookings';

export function getBookingTotal(
  booking: BusinessBooking | null | undefined,
): number {
  if (!booking) return 0;
  return booking.feeBreakdown?.total ?? booking.total ?? booking.customAmount ?? 0;
}

export function getBookingCustomerName(
  booking: BusinessBooking | null | undefined,
): string {
  if (!booking) return 'Customer';
  const u = booking.userId;
  if (u && typeof u === 'object') {
    const full =
      u.fullName ??
      `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() ??
      '';
    return full || 'Customer';
  }
  return 'Customer';
}

export function getBookingCustomerPhone(
  booking: BusinessBooking | null | undefined,
): string | null {
  if (!booking) return null;
  const u = booking.userId;
  if (u && typeof u === 'object') return u.phone ?? null;
  return null;
}

export function getServiceName(
  booking: BusinessBooking | null | undefined,
): string {
  if (!booking) return 'Service';
  if (booking.source === 'CHAT') {
    return booking.customDescription ?? 'Custom quote';
  }
  return (
    booking.serviceSnapshot?.name ??
    (typeof booking.serviceId === 'object' ? booking.serviceId?.name : null) ??
    'Service'
  );
}

export function getServicePrice(
  snapshot: BookingServiceSnapshot | null | undefined,
): number {
  if (!snapshot) return 0;
  return snapshot.basePrice ?? snapshot.price ?? 0;
}

export function getBookingDuration(
  booking: BusinessBooking | null | undefined,
): number {
  if (!booking) return 0;
  return (
    booking.durationMinutes ??
    booking.serviceSnapshot?.durationMinutes ??
    0
  );
}

/**
 * Local-safe "when is this booking?" string.
 * Handles both `bookingDate + startTime` (catalog) and a bare `createdAt`
 * fallback (chat bookings before scheduling).
 */
export function getBookingSchedule(
  booking: BusinessBooking | null | undefined,
): string {
  if (!booking) return '';
  if (booking.bookingDate) {
    const d = new Date(booking.bookingDate);
    const dateStr = Number.isNaN(d.getTime())
      ? booking.bookingDate
      : d.toLocaleDateString('en-NG', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
    return booking.startTime ? `${dateStr} · ${booking.startTime}` : dateStr;
  }
  return 'Not scheduled';
}
