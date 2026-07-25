'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

export type RubyRarity = 'COMMON' | 'RARE' | 'LEGENDARY';
export interface RubyQuestCampaign { _id: string; tier: RubyRarity; status: string; startDate: string; endDate: string; lastSpawnedAt?: string | null; paymentSource: 'WALLET'; }
export function useRubyQuestCampaigns() { const { business } = useBusinessAuth(); const id = business?._id ?? ''; const fetcher = useCallback(() => api.businessRubyQuest.campaigns(id), [id]); return useBusinessQuery<{ items: RubyQuestCampaign[] }>(fetcher, [id], { enabled: !!id }); }
export function useRubyQuestAnalytics() { const { business } = useBusinessAuth(); const id = business?._id ?? ''; const fetcher = useCallback(() => api.businessRubyQuest.analytics(id), [id]); return useBusinessQuery<any>(fetcher, [id], { enabled: !!id }); }
export function useSubscribeRubyQuest(onSuccess?: () => void) { const { business } = useBusinessAuth(); return useMutation<RubyQuestCampaign, { tier: RubyRarity }>((data) => api.businessRubyQuest.subscribe({ businessId: business?._id, ...data, paymentSource: 'WALLET' }), { onSuccess }); }
export function usePauseRubyQuest(onSuccess?: () => void) { return useMutation<RubyQuestCampaign, string>((id) => api.businessRubyQuest.pause(id), { onSuccess }); }
export function useResumeRubyQuest(onSuccess?: () => void) { return useMutation<RubyQuestCampaign, string>((id) => api.businessRubyQuest.resume(id), { onSuccess }); }
