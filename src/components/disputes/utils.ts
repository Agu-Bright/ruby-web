/**
 * Dispute-page shared helpers, extracted from the old monolithic page so
 * every component in the redesign reads from the same source of truth.
 *
 * NOTHING here mutates state — pure functions only. Anything stateful
 * (websocket subscription, mutations, etc.) belongs in the component
 * files alongside the React tree it serves.
 */
import {
  ShoppingCart,
  CalendarCheck,
  CreditCard,
  Wallet,
  ArrowUpRight,
  Truck,
  Map as MapIcon,
  Zap,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import type { Dispute, DisputeType } from '@/lib/types';

/**
 * Per-type visual styling. Stays consistent across the inbox list, chat
 * header, and meta strip so an admin can recognise the type at a glance
 * regardless of where the icon appears.
 */
export const TYPE_ICONS: Record<
  DisputeType,
  { icon: LucideIcon; bg: string; color: string }
> = {
  ORDER: { icon: ShoppingCart, bg: 'bg-blue-50', color: 'text-blue-600' },
  BOOKING: { icon: CalendarCheck, bg: 'bg-violet-50', color: 'text-violet-600' },
  PAYMENT: { icon: CreditCard, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  WALLET: { icon: Wallet, bg: 'bg-amber-50', color: 'text-amber-600' },
  PAYOUT: { icon: ArrowUpRight, bg: 'bg-cyan-50', color: 'text-cyan-600' },
  DELIVERY: { icon: Truck, bg: 'bg-orange-50', color: 'text-orange-600' },
  RIDE: { icon: MapIcon, bg: 'bg-pink-50', color: 'text-pink-600' },
  AD: { icon: Zap, bg: 'bg-indigo-50', color: 'text-indigo-600' },
  GENERAL: { icon: HelpCircle, bg: 'bg-gray-100', color: 'text-gray-600' },
};

/**
 * Deep-link admins from a dispute to the underlying transaction record
 * (order detail, booking detail, finance ledger entry, etc.). Returns
 * null when the dispute is untethered (e.g. GENERAL "Help & Support").
 */
export function getReferenceUrl(d: Dispute): string | null {
  const refId =
    d.referenceId ||
    (typeof d.orderId === 'object' ? d.orderId._id : d.orderId) ||
    (typeof d.bookingId === 'object' ? d.bookingId._id : d.bookingId);
  if (!refId) return null;
  switch (d.type) {
    case 'ORDER':
      return `/ruby-app/admin/orders?id=${refId}`;
    case 'BOOKING':
      return `/ruby-app/admin/bookings?id=${refId}`;
    case 'PAYOUT':
      return `/ruby-app/admin/finance?tab=payouts&id=${refId}`;
    case 'WALLET':
    case 'PAYMENT':
      return `/ruby-app/admin/finance?tab=ledger&id=${refId}`;
    case 'AD':
      return `/ruby-app/admin/ads?id=${refId}`;
    default:
      return null;
  }
}

export function getReferenceLabel(d: Dispute): string {
  if (d.referenceLabel) return d.referenceLabel;
  if (typeof d.orderId === 'object' && d.orderId.orderNumber)
    return `Order #${d.orderId.orderNumber}`;
  if (typeof d.bookingId === 'object' && d.bookingId.bookingRef)
    return `Booking ${d.bookingId.bookingRef}`;
  return d.type;
}

export function getCustomerName(d: Dispute): string {
  if (typeof d.userId === 'object') {
    const u = d.userId;
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ');
    return name || u.email || 'Customer';
  }
  return d.filedByName || 'Customer';
}

export function getBusinessName(d: Dispute): string | null {
  if (!d.businessId) return null;
  if (typeof d.businessId === 'object') return d.businessId.name || null;
  return d.againstName || null;
}

/** Last activity = newest of (latest message createdAt, dispute updatedAt). */
export function getLastActivityAt(d: Dispute): string {
  const lastMsg = d.messages?.length
    ? d.messages[d.messages.length - 1].createdAt
    : null;
  if (!lastMsg) return d.updatedAt || d.createdAt;
  return lastMsg > (d.updatedAt || d.createdAt)
    ? lastMsg
    : d.updatedAt || d.createdAt;
}

/** Excerpt of the latest message body for the inbox preview line. */
export function getLastMessagePreview(d: Dispute, max = 80): string {
  const msgs = d.messages || [];
  if (!msgs.length) return d.description || '';
  const last = msgs[msgs.length - 1];
  const text = last.message || last.text || '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

/**
 * Short human time-ago label: "2m", "3h", "Yesterday", "Apr 12". Used in
 * the dense inbox list where full timestamps would be too noisy.
 */
export function shortAgo(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = now - then;
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'Yesterday';
  if (day < 7) return `${day}d`;
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/** True iff the thread accepts no more messages (no composer rendered). */
export function isThreadClosed(d: Dispute | null): boolean {
  if (!d) return false;
  return d.status === 'RESOLVED' || d.status === 'CLOSED';
}
