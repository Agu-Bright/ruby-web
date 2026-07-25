'use client';

/**
 * Business-side lightweight hook helpers.
 *
 * Wraps the admin `useApi` / `useMutation` pattern with two things the
 * mobile business app needs frequently:
 *   1. `pollMs` — refetch on an interval (mobile uses 15/30/60s polling
 *      for daily-ops, orders, wallet, delivery). Stops when component
 *      unmounts or when `enabled` flips false. Also pauses when the tab
 *      is hidden, so background tabs don't waste API quota.
 *   2. `useBusinessQuery(fetcher, deps, opts)` — convenience wrapper
 *      that mirrors mobile React Query semantics on the useApi surface.
 *
 * When the M6/M8 parallel client refactor lands, these hooks will keep
 * their signature (that's the whole point of a thin wrapper); only the
 * underlying fetch call swaps.
 */

import { useEffect, useRef } from 'react';
import { useApi } from '@/lib/hooks';
import type { ApiResponse } from '@/lib/types';

interface BusinessQueryOptions {
  enabled?: boolean;
  /** Polling cadence in ms. 0/undefined = poll off. */
  pollMs?: number;
}

/**
 * Wraps `useApi` with optional polling. Restarts the poller when
 * dependencies change; pauses when the tab is hidden.
 */
export function useBusinessQuery<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = [],
  options: BusinessQueryOptions = {},
) {
  const { enabled = true, pollMs } = options;
  const query = useApi(fetcher, deps, { enabled });
  const refetchRef = useRef(query.refetch);
  refetchRef.current = query.refetch;

  useEffect(() => {
    if (!enabled || !pollMs || pollMs <= 0) return;
    let id: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (id) return;
      id = setInterval(() => {
        // Skip when tab isn't visible — cheap parity with mobile's
        // "app in background" pauses via AppState.
        if (typeof document !== 'undefined' && document.hidden) return;
        refetchRef.current?.();
      }, pollMs);
    };
    const stop = () => {
      if (!id) return;
      clearInterval(id);
      id = null;
    };

    start();

    // React to tab visibility. Refetching on visibilitychange also
    // catches "user came back after 20 min" — matches mobile app-resume.
    const onVisibility = () => {
      if (typeof document === 'undefined') return;
      if (document.hidden) {
        stop();
      } else {
        refetchRef.current?.();
        start();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      stop();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pollMs, ...deps]);

  return query;
}
