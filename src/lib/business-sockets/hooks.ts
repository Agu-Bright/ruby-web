'use client';

import { useEffect, useRef } from 'react';
import { type BusinessSocketNamespace, useBusinessSockets } from './business-sockets-provider';

type RealtimeOptions = { onChange?: () => void; id?: string };
type DeliveryRealtimeOptions = RealtimeOptions & {
  onLocation?: (location: { lat: number; lng: number; updatedAt?: string }) => void;
};
type BookingTrackingOptions = RealtimeOptions & {
  onProviderLocation?: (location: { lat: number; lng: number; bearing?: number }) => void;
};

const INVALIDATIONS_BY_TYPE: Record<string, readonly string[]> = {
  WALLET_CREDIT: ['wallets', 'wallet-stats', 'wallet-transactions'],
  WALLET_DEBIT: ['wallets', 'wallet-stats', 'wallet-transactions'],
  WALLET_TRANSFER_SENT: ['wallets', 'wallet-stats', 'wallet-transactions'],
  ORDER_PLACED: ['orders', 'business-orders'],
  ORDER_ACCEPTED: ['orders', 'business-orders'],
  ORDER_PREPARING: ['orders', 'business-orders'],
  ORDER_READY: ['orders', 'business-orders'],
  ORDER_DISPATCHED: ['orders', 'business-orders'],
  ORDER_DELIVERED: ['orders', 'business-orders', 'wallets'],
  ORDER_COMPLETED: ['orders', 'business-orders', 'wallets'],
  ORDER_CANCELLED: ['orders', 'business-orders', 'wallets'],
  BOOKING_NEW: ['bookings'],
  BOOKING_CONFIRMED: ['bookings'],
  BOOKING_IN_PROGRESS: ['bookings'],
  BOOKING_COMPLETED: ['bookings', 'wallets', 'wallet-transactions'],
  BOOKING_CANCELLED: ['bookings', 'wallets', 'wallet-transactions'],
  PAYOUT_REQUESTED: ['payouts', 'wallets', 'wallet-stats'],
  PAYOUT_APPROVED: ['payouts', 'wallets'],
  PAYOUT_REJECTED: ['payouts', 'wallets', 'wallet-stats'],
  PAYOUT_COMPLETED: ['payouts', 'wallets', 'wallet-stats'],
  PAYOUT_FAILED: ['payouts', 'wallets', 'wallet-stats'],
  DISPUTE_FILED: ['disputes'],
  DISPUTE_RESOLVED: ['disputes'],
  DISPUTE_MESSAGE: ['disputes'],
  BUSINESS_APPROVED: ['my-businesses', 'business'],
  BUSINESS_REJECTED: ['my-businesses', 'business'],
  REVIEW_RECEIVED: ['reviews', 'business-reviews'],
  REVIEW_REPLIED: ['reviews', 'business-reviews'],
  AD_SUBMITTED: ['ad-campaigns', 'ad-stats'],
  AD_APPROVED: ['ad-campaigns', 'ad-campaign', 'ad-stats', 'wallets'],
  AD_REJECTED: ['ad-campaigns', 'ad-campaign', 'ad-stats', 'wallets'],
  AD_ACTIVE: ['ad-campaigns', 'ad-campaign', 'ad-stats'],
  AD_EXPIRED: ['ad-campaigns', 'ad-campaign', 'ad-stats'],
  CHAT_MESSAGE: ['chat-conversations', 'chat-unread-total'],
};

export { INVALIDATIONS_BY_TYPE };

function useSocketEvents(namespace: BusinessSocketNamespace, events: string[], onChange?: () => void) {
  const { subscribe } = useBusinessSockets();
  const callbackRef = useRef(onChange);
  callbackRef.current = onChange;
  const eventsKey = events.join('|');

  useEffect(() => {
    const handler = () => callbackRef.current?.();
    const cleanups = events.map((event) => subscribe(namespace, event, handler));
    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
    // eventsKey keeps literal event arrays from re-subscribing on each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, subscribe, eventsKey]);
}

export function useOrdersRealtime({ onChange, id }: RealtimeOptions = {}) {
  const { emit, subscribe } = useBusinessSockets();
  useSocketEvents('orders', ['order_status_changed'], onChange);
  useEffect(() => {
    if (!id) return;
    const join = () => emit('orders', 'join_order', { orderId: id });
    join();
    const unsubscribe = subscribe('orders', 'connect', join);
    return () => {
      emit('orders', 'leave_order', { orderId: id });
      unsubscribe();
    };
  }, [id, emit, subscribe]);
}

export function useBookingsRealtime({ onChange, id }: RealtimeOptions = {}) {
  const { emit, subscribe } = useBusinessSockets();
  useSocketEvents('bookings', ['booking_status_changed', 'booking_completed', 'booking_payment_received'], onChange);
  useEffect(() => {
    if (!id) return;
    const join = () => emit('bookings', 'join_booking', { bookingId: id });
    join();
    const unsubscribe = subscribe('bookings', 'connect', join);
    return () => {
      emit('bookings', 'leave_booking', { bookingId: id });
      unsubscribe();
    };
  }, [id, emit, subscribe]);
}

export function useDeliveryRealtime({ onChange, id, onLocation }: DeliveryRealtimeOptions = {}) {
  const { emit, subscribe } = useBusinessSockets();
  useSocketEvents('delivery', ['delivery_status_changed', 'rider_assigned', 'delivery_completed'], onChange);
  const locationRef = useRef(onLocation);
  locationRef.current = onLocation;
  useEffect(() => subscribe('delivery', 'rider_location_updated', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const event = payload as { orderId?: string; lat?: number; lng?: number; updatedAt?: string };
    if (id && event.orderId !== id) return;
    if (typeof event.lat === 'number' && typeof event.lng === 'number') {
      locationRef.current?.({ lat: event.lat, lng: event.lng, updatedAt: event.updatedAt });
    }
  }), [id, subscribe]);
  useEffect(() => {
    if (!id) return;
    const join = () => emit('delivery', 'join_order', { orderId: id });
    join();
    const unsubscribe = subscribe('delivery', 'connect', join);
    return () => {
      emit('delivery', 'leave_order', { orderId: id });
      unsubscribe();
    };
  }, [id, emit, subscribe]);
}

export function useBookingTrackingRealtime({ onChange, id, onProviderLocation }: BookingTrackingOptions = {}) {
  const { subscribe } = useBusinessSockets();
  useBookingsRealtime({ onChange, id });
  const locationRef = useRef(onProviderLocation);
  locationRef.current = onProviderLocation;
  useEffect(() => subscribe('bookings', 'provider_location_updated', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const event = payload as { bookingId?: string; lat?: number; lng?: number; bearing?: number };
    if (id && event.bookingId !== id) return;
    if (typeof event.lat === 'number' && typeof event.lng === 'number') {
      locationRef.current?.({ lat: event.lat, lng: event.lng, bearing: event.bearing });
    }
  }), [id, subscribe]);
}

export function useChatRealtime(onChange?: () => void) {
  useSocketEvents('chat', ['message_new', 'typing', 'conversation_updated'], onChange);
}

export function useDisputesRealtime(onChange?: () => void) {
  useSocketEvents('disputes', ['dispute_updated', 'dispute_message', 'typing'], onChange);
}

export function useBusinessStatusRealtime(onChange?: () => void) {
  useSocketEvents('businesses', ['business:status'], onChange);
}

export function useNotificationsRealtime(onNotification?: (type?: string) => void) {
  const { subscribe } = useBusinessSockets();
  const callbackRef = useRef(onNotification);
  callbackRef.current = onNotification;
  useEffect(() => subscribe('notifications', 'notification_new', (payload: unknown) => {
    const type = typeof payload === 'object' && payload ? (payload as { type?: string }).type : undefined;
    callbackRef.current?.(type);
  }), [subscribe]);
}
