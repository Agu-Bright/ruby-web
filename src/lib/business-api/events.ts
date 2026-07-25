'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

export type EventStatus = 'DRAFT' | 'PENDING_REVIEW' | 'REJECTED' | 'PUBLISHED' | 'SOLD_OUT' | 'CANCELLED' | 'COMPLETED';
export interface BusinessEvent { _id: string; title: string; description: string; organizerBusinessId: string; venueName: string; venueAddress: string; locationId: string | { _id: string; name: string }; geoPoint?: { type: 'Point'; coordinates: [number, number] }; startsAt: string; endsAt: string; coverImageUrl: string; ticketTiers: Array<{ name: string; priceNgn: number; quantityAvailable: number; quantitySold: number; perks: string[] }>; status: EventStatus; rejectionReason?: string; }
export function useMyEvents(params: Record<string, unknown> = {}) { const { business } = useBusinessAuth(); const id = business?._id ?? ''; const key = JSON.stringify(params); const fetcher = useCallback(() => api.businessEvents.list({ businessId: id, ...params }), [id, key]); return useBusinessQuery<BusinessEvent[]>(fetcher, [id, key], { enabled: !!id }); }
export function useEventDetail(id: string) { const fetcher = useCallback(() => api.businessEvents.detail(id), [id]); return useBusinessQuery<BusinessEvent>(fetcher, [id], { enabled: !!id }); }
export function useCreateEvent(onSuccess?: (data: BusinessEvent) => void) { return useMutation<BusinessEvent, Record<string, unknown>>((data) => api.businessEvents.create(data), { onSuccess }); }
export function useUpdateEvent(id: string, onSuccess?: (data: BusinessEvent) => void) { return useMutation<BusinessEvent, Record<string, unknown>>((data) => api.businessEvents.update(id, data), { onSuccess }); }
export function useEventAction(action: 'submit' | 'withdraw' | 'cancel', onSuccess?: (data: BusinessEvent) => void) { return useMutation<BusinessEvent, string>((id) => api.businessEvents[action](id), { onSuccess }); }
export function useEventTickets(id: string) { const fetcher = useCallback(() => api.businessEvents.tickets(id), [id]); return useBusinessQuery<any[]>(fetcher, [id], { enabled: !!id }); }
export function useEventAnalytics(id: string) { const fetcher = useCallback(() => api.businessEvents.analytics(id), [id]); return useBusinessQuery<any>(fetcher, [id], { enabled: !!id }); }
export function useScanTicket(eventId: string, onSuccess?: (data: any) => void) { return useMutation<any, string>((qrCode) => api.businessEvents.scan(eventId, qrCode), { onSuccess }); }
export function useEventPlatformFee(locationId?: string) { const fetcher = useCallback(() => api.businessEvents.platformFee(locationId), [locationId]); return useBusinessQuery<any>(fetcher, [locationId]); }
