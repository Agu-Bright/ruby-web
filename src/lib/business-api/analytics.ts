'use client';

/**
 * Analytics hooks — mirror of mobile `useAnalytics.ts` +
 * `useDailyOperations.useDashboardStats`.
 *
 * Backend endpoints:
 *   - GET /business/analytics?businessId=…
 *   - GET /business/analytics/engagement?businessId=…&startDate=…&endDate=…
 *   - GET /business/analytics/reviews?businessId=…
 *   - GET /business/orders/stats/dashboard?businessId=…   (dashboard KPIs)
 */

import { useCallback } from 'react';
import { api } from '@/lib/api';
import { useBusinessAuth } from '@/lib/business-auth';
import { useBusinessQuery } from './hooks';

export function useDashboardStats() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessAnalytics.getDashboardStats(businessId),
    [businessId],
  );
  return useBusinessQuery(fetcher, [businessId], {
    enabled: !!businessId,
    pollMs: 60_000,
  });
}

export function useBusinessAnalytics(startDate?: string, endDate?: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessAnalytics.getBusiness(businessId, startDate, endDate),
    [businessId, startDate, endDate],
  );
  return useBusinessQuery(fetcher, [businessId, startDate, endDate], {
    enabled: !!businessId,
  });
}

export function useBusinessEngagement(startDate?: string, endDate?: string) {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessAnalytics.getEngagement(businessId, startDate, endDate),
    [businessId, startDate, endDate],
  );
  return useBusinessQuery(fetcher, [businessId, startDate, endDate], {
    enabled: !!businessId,
  });
}

export function useBusinessReviewStats() {
  const { business } = useBusinessAuth();
  const businessId = business?._id ?? '';
  const fetcher = useCallback(
    () => api.businessAnalytics.getReviewStats(businessId),
    [businessId],
  );
  return useBusinessQuery(fetcher, [businessId], {
    enabled: !!businessId,
  });
}
