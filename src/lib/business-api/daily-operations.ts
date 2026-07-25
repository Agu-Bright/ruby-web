'use client';

/**
 * Daily-operations hooks — mirror of mobile `useDailyOperations.ts`.
 *
 * Backend endpoints:
 *   - GET  /business/daily-operations/today?businessId=…
 *   - POST /business/daily-operations/open
 *   - POST /business/daily-operations/offline
 *   - POST /business/daily-operations/inventory
 *
 * The mobile app polls `today` every 60s so the dashboard's
 * `StoreStatusBar` reflects auto-open cron flips + admin overrides
 * without a manual refresh — we do the same on web via `useBusinessQuery`.
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useMutation } from '@/lib/hooks';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

export function useTodayStatus() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessDailyOperations.getTodayStatus(businessId),
    [businessId],
  );
  return useBusinessQuery(fetcher, [businessId], {
    enabled: !!businessId,
    pollMs: 60_000,
  });
}

export function useOpenDay(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<unknown, { closingTime: string; inventory?: Array<{ productId: string; isAvailable: boolean }>; services?: Array<{ serviceId: string; isAvailable: boolean }> }>(
    (input) =>
      api.businessDailyOperations.openDay({
        businessId: business?._id ?? '',
        ...input,
      }),
    { onSuccess },
  );
}

export function useGoOffline(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<unknown, void>(
    () =>
      api.businessDailyOperations.goOffline({
        businessId: business?._id ?? '',
      }),
    { onSuccess },
  );
}

export function useUpdateInventory(onSuccess?: () => void) {
  const { business } = useBusinessAuth();
  return useMutation<
    unknown,
    { inventory: Array<{ productId: string; isAvailable: boolean }> }
  >(
    (input) =>
      api.businessDailyOperations.updateInventory({
        businessId: business?._id ?? '',
        ...input,
      }),
    { onSuccess },
  );
}
