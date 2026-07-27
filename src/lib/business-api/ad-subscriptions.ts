'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessQuery } from './hooks';

export type AdTier = 'STARTER' | 'GROWTH' | 'PRIME';
export interface AdTierDefinition { tier: AdTier; displayName: string; weeklyAmountNgn: number; pushBlastsPerWeek: number; reelsPerMonth: number; perkBullets: readonly string[]; [key: string]: unknown }
export interface AdSubscriptionStatus { subscription: { _id: string; tier: AdTier; status: string; weeklyAmountNgn: number; currentPeriodEnd: string; autoRenew: boolean; pendingDowngradeToTier?: AdTier; cardBrand?: string; cardLast4?: string; [key: string]: unknown }; tier: AdTierDefinition; quotas: { push: { used: number; cap: number; remaining: number }; reels: { used: number; cap: number; remaining: number } } }

export function useAdSubscriptionTiers() { const fetcher = useCallback(() => api.businessAdSubscriptions.tiers(), []); return useBusinessQuery<AdTierDefinition[]>(fetcher, []); }
export function useAdSubscriptionStatus() { const fetcher = useCallback(() => api.businessAdSubscriptions.status(), []); return useBusinessQuery<AdSubscriptionStatus | null>(fetcher, []); }
export function useSavedAdCard() { const fetcher = useCallback(() => api.businessAdSubscriptions.savedCard(), []); return useBusinessQuery<any>(fetcher, []); }
export function useInitializePaystackAdSubscription() { return useMutation<{ authorizationUrl: string; reference: string }, { tier: AdTier; email?: string; callbackUrl?: string }>((data) => api.businessAdSubscriptions.initializePaystack(data)); }
export function useVerifyPaystackAdSubscription(onSuccess?: () => void) { return useMutation<any, { reference: string }>((data) => api.businessAdSubscriptions.verifyPaystack(data), { onSuccess }); }
export function useSubscribeWithSavedCard(onSuccess?: () => void) { return useMutation<any, { tier: AdTier }>((data) => api.businessAdSubscriptions.subscribeWithSavedCard(data), { onSuccess }); }
export function useChangeTierWallet(onSuccess?: () => void) { return useMutation<any, { tier: AdTier }>((data) => api.businessAdSubscriptions.changeTierWallet(data), { onSuccess }); }
export function usePreviewTierSwitch() { return useMutation<any, { tier: AdTier }>((data) => api.businessAdSubscriptions.previewTierSwitch(data)); }
export function useScheduleDowngrade(onSuccess?: () => void) { return useMutation<any, { tier: AdTier }>((data) => api.businessAdSubscriptions.scheduleDowngrade(data), { onSuccess }); }
export function useCancelPendingDowngrade(onSuccess?: () => void) { return useMutation<any, void>(() => api.businessAdSubscriptions.cancelPendingDowngrade(), { onSuccess }); }
export function useSetAdSubAutoRenew(onSuccess?: () => void) { return useMutation<any, boolean>((autoRenew) => api.businessAdSubscriptions.setAutoRenew({ autoRenew }), { onSuccess }); }
export function usePauseAdSubscription(onSuccess?: () => void) { return useMutation<any, { reason?: string }>((data) => api.businessAdSubscriptions.pause(data), { onSuccess }); }
export function useResumeAdSubscription(onSuccess?: () => void) { return useMutation<any, void>(() => api.businessAdSubscriptions.resume(), { onSuccess }); }
export function useSetAdSubscriptionBanner(onSuccess?: () => void) { return useMutation<any, { imageUrl: string; ctaText?: string }>((data) => api.businessAdSubscriptions.setBanner(data), { onSuccess }); }
