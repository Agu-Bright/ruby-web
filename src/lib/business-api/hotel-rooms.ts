'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessQuery } from './hooks';

export type RoomType = 'STANDARD' | 'DELUXE' | 'SUITE' | 'EXECUTIVE' | 'FAMILY' | 'PENTHOUSE' | 'STUDIO' | 'APARTMENT';
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

export function useHotelRooms() { return useBusinessQuery(() => api.businessHotelRooms.list(), [], { enabled: true }); }
export function useHotelRoom(roomId: string) { const fetcher = useCallback(() => api.businessHotelRooms.detail(roomId), [roomId]); return useBusinessQuery(fetcher, [roomId], { enabled: !!roomId }); }
export function useRoomOccupancy(startDate: string, endDate: string) { const fetcher = useCallback(() => api.businessHotelRooms.occupancy(startDate, endDate), [startDate, endDate]); return useBusinessQuery(fetcher, [startDate, endDate], { enabled: !!startDate && !!endDate }); }
export function useCreateHotelRoom(onSuccess?: () => void) { return useMutation<HotelRoom, CreateHotelRoomPayload>((data) => api.businessHotelRooms.create(data), { onSuccess }); }
export function useUpdateHotelRoom(onSuccess?: () => void) { return useMutation<HotelRoom, { roomId: string; data: UpdateHotelRoomPayload }>(({ roomId, data }) => api.businessHotelRooms.update(roomId, data), { onSuccess }); }
export function useArchiveHotelRoom(onSuccess?: () => void) { return useMutation<HotelRoom, string>((roomId) => api.businessHotelRooms.archive(roomId), { onSuccess }); }
