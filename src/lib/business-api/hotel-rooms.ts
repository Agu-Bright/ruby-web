'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

/** A hotel-defined label, e.g. "Garden Cottage" or "Executive King Room". */
export type RoomType = string;
export type RoomStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE';
export type BedType = 'KING' | 'QUEEN' | 'DOUBLE' | 'SINGLE' | 'BUNK' | 'SOFA_BED';
export interface HotelRoomMedia { url: string; type?: 'IMAGE' | 'VIDEO'; order?: number; }
export interface HotelRoom {
  _id: string; name: string; roomType: RoomType; description?: string; media: HotelRoomMedia[];
  coverImageUrl?: string; pricePerNightNgn: number; compareAtPricePerNightNgn?: number;
  bedConfig?: { beds?: Array<{ type: BedType; count: number }> }; maxGuests: number; totalUnits: number;
  amenities?: string[]; sizeSqm?: number; smokingAllowed?: boolean; minStayNights?: number;
  maxStayNights?: number; cancellationPolicy?: { freeCancellationHours?: number; cancellationFeePercent?: number };
  status: RoomStatus; displayOrder?: number;
}
export interface CreateHotelRoomPayload {
  name: string; roomType: RoomType; description?: string; media: HotelRoomMedia[]; pricePerNightNgn: number;
  compareAtPricePerNightNgn?: number; bedConfig?: HotelRoom['bedConfig']; maxGuests: number; totalUnits: number;
  amenities?: string[]; sizeSqm?: number; smokingAllowed?: boolean; minStayNights?: number; maxStayNights?: number;
  cancellationPolicy?: HotelRoom['cancellationPolicy']; status?: RoomStatus; displayOrder?: number;
}
export type UpdateHotelRoomPayload = Partial<CreateHotelRoomPayload>;
export interface RoomOccupancy { roomId: string; name: string; totalUnits: number; bookedUnits: number; availableUnits: number; }

// Rooms are scoped to the currently-selected branch (`useBusinessAuth().business`),
// the web equivalent of the mobile app's selectedBusiness. Every call passes
// that businessId so a branch's rooms file under the branch, not the parent.
export function useHotelRooms() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(() => api.businessHotelRooms.list(businessId), [businessId]);
  return useBusinessQuery(fetcher, [businessId], { enabled: !!businessId });
}
export function useHotelRoom(roomId: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(() => api.businessHotelRooms.detail(roomId, businessId), [roomId, businessId]);
  return useBusinessQuery(fetcher, [roomId, businessId], { enabled: !!roomId && !!businessId });
}
export function useRoomOccupancy(startDate: string, endDate: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(() => api.businessHotelRooms.occupancy(startDate, endDate, businessId), [startDate, endDate, businessId]);
  return useBusinessQuery(fetcher, [startDate, endDate, businessId], { enabled: !!startDate && !!endDate && !!businessId });
}
export function useCreateHotelRoom(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  return useMutation<HotelRoom, CreateHotelRoomPayload>((data) => api.businessHotelRooms.create(data, businessId), { onSuccess });
}
export function useUpdateHotelRoom(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  return useMutation<HotelRoom, { roomId: string; data: UpdateHotelRoomPayload }>(({ roomId, data }) => api.businessHotelRooms.update(roomId, data, businessId), { onSuccess });
}
export function useArchiveHotelRoom(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  return useMutation<HotelRoom, string>((roomId) => api.businessHotelRooms.archive(roomId, businessId), { onSuccess });
}
