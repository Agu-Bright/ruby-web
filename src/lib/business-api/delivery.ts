'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessQuery } from './hooks';

export type DeliveryJobStatus =
  | 'CREATED' | 'ASSIGNED' | 'RIDER_ACCEPTED' | 'RIDER_AT_PICKUP'
  | 'PICKED_UP' | 'IN_TRANSIT' | 'RIDER_AT_DROPOFF' | 'DELIVERED'
  | 'FAILED' | 'CANCELLED';

export interface DeliveryCoordinates {
  lat: number;
  lng: number;
  address?: string;
  landmark?: string;
  contactName?: string;
  contactPhone?: string;
  instructions?: string;
}

export interface RiderInfo {
  name?: string;
  phone?: string;
  vehicleType?: string;
  vehiclePlate?: string;
  photoUrl?: string;
  rating?: number;
}

export interface DeliveryJob {
  _id: string;
  orderId?: string;
  bookingId?: string;
  businessId: string;
  userId: string;
  provider?: 'MANUAL' | 'INTERNAL' | 'TOPSHIP' | 'GLOVO';
  pickup: DeliveryCoordinates;
  dropoff: DeliveryCoordinates;
  riderInfo?: RiderInfo;
  status: DeliveryJobStatus;
  statusTimeline?: Array<{ status: DeliveryJobStatus; timestamp: string; note?: string }>;
  distanceKm?: number;
  deliveryFee?: number;
  estimatedDeliveryAt?: string;
  lastKnownLocation?: { lat: number; lng: number; updatedAt?: string };
  proofOfDeliveryUrl?: string;
}

export interface CreateDeliveryJobPayload {
  orderId: string;
  businessId?: string;
  userId: string;
  locationId: string;
  provider?: 'MANUAL' | 'INTERNAL' | 'TOPSHIP' | 'GLOVO';
  pickup: DeliveryCoordinates;
  dropoff: DeliveryCoordinates;
  notes?: string;
}

export interface AssignRiderPayload {
  riderInfo: RiderInfo;
  estimatedPickupAt?: string;
  estimatedDeliveryAt?: string;
}

export interface UpdateDeliveryStatusPayload {
  status: DeliveryJobStatus;
  note?: string;
  location?: { lat: number; lng: number };
  proofOfDeliveryUrl?: string;
}

export function useDeliveryJobs(params?: { status?: string; page?: number; limit?: number }) {
  const key = `${params?.status ?? ''}|${params?.page ?? ''}|${params?.limit ?? ''}`;
  const fetcher = useCallback(() => api.businessDelivery.listJobs(params), [key]);
  return useBusinessQuery(fetcher, [key]);
}

export function useDeliveryJob(id: string) {
  const fetcher = useCallback(() => api.businessDelivery.getJob(id), [id]);
  return useBusinessQuery(fetcher, [id], { enabled: !!id });
}

export function useDeliveryJobByOrder(orderId: string) {
  const fetcher = useCallback(() => api.businessDelivery.getJobByOrder(orderId), [orderId]);
  return useBusinessQuery(fetcher, [orderId], { enabled: !!orderId });
}

export function useCreateDeliveryJob(onSuccess?: () => void) {
  return useMutation<DeliveryJob, CreateDeliveryJobPayload>(
    (data) => api.businessDelivery.createJob(data),
    { onSuccess },
  );
}

export function useAssignRider(onSuccess?: () => void) {
  return useMutation<DeliveryJob, { jobId: string; data: AssignRiderPayload }>(
    ({ jobId, data }) => api.businessDelivery.assignRider(jobId, data),
    { onSuccess },
  );
}

export function useUpdateDeliveryStatus(onSuccess?: () => void) {
  return useMutation<DeliveryJob, { jobId: string; data: UpdateDeliveryStatusPayload }>(
    ({ jobId, data }) => api.businessDelivery.updateStatus(jobId, data),
    { onSuccess },
  );
}

export function useUpdateDeliveryLocation(onSuccess?: () => void) {
  return useMutation<DeliveryJob, { jobId: string; lat: number; lng: number }>(
    ({ jobId, lat, lng }) => api.businessDelivery.updateLocation(jobId, lat, lng),
    { onSuccess },
  );
}

export function useDeliveryTracking(id: string) {
  const fetcher = useCallback(() => api.businessDelivery.trackJob(id), [id]);
  return useBusinessQuery(fetcher, [id], { enabled: !!id });
}
