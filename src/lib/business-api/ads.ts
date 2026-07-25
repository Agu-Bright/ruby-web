'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';
import type { AdCampaign, AdCampaignStats } from '@/lib/types';

export function useAdCampaigns(params: Record<string, unknown> = {}) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const key = JSON.stringify(params);
  const fetchCampaigns = useCallback(
    () => api.businessAds.list({ businessId, ...params }),
    [businessId, key],
  );
  return useBusinessQuery(fetchCampaigns, [businessId, key], { enabled: !!businessId });
}

export function useAdCampaign(id: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetchCampaign = useCallback(
    () => api.businessAds.detail(id, businessId),
    [id, businessId],
  );
  return useBusinessQuery(fetchCampaign, [id, businessId], { enabled: !!id && !!businessId });
}

export function useAdStats() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetchStats = useCallback(() => api.businessAds.stats(businessId), [businessId]);
  return useBusinessQuery<AdCampaignStats>(fetchStats, [businessId], { enabled: !!businessId });
}

export function useCreateAdCampaign(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<AdCampaign, Record<string, unknown>>(
    (data) => api.businessAds.create(business?._id ?? '', data),
    { onSuccess },
  );
}

export function useCreateOrganicReel(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<AdCampaign, Record<string, unknown>>(
    (data) => api.businessAds.createReel(business?._id ?? '', data),
    { onSuccess },
  );
}

export function useMyOrganicReels(page = 1) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetchReels = useCallback(() => api.businessAds.reels(businessId, page), [businessId, page]);
  return useBusinessQuery(fetchReels, [businessId, page], { enabled: !!businessId });
}

export interface PushBlastRequest {
  _id: string;
  message: string;
  radiusKm: number;
  status: 'PENDING' | 'SENT' | 'REJECTED' | 'STALE';
  recipientCount?: number;
  rejectionReason?: string;
  createdAt: string;
}

export function useRequestPushBlast(onSuccess?: () => void) {
  return useMutation<PushBlastRequest, { message: string; radiusKm: number }>(
    (data) => api.businessAdSubscriptions.requestPushBlast(data),
    { onSuccess },
  );
}

export function usePushBlastRequests() {
  const fetchRequests = useCallback(() => api.businessAdSubscriptions.listPushBlastRequests(), []);
  return useBusinessQuery(fetchRequests, []);
}

export function useAdAction(action: 'pause' | 'resume' | 'cancel' | 'rerun', onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<AdCampaign, string>(
    (id) => api.businessAds[action](id, business?._id ?? ''),
    { onSuccess },
  );
}
