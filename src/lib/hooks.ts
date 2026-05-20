'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { ApiResponse, ApiMeta } from '@/lib/types';
import { ApiClientError } from '@/lib/api';

interface UseApiOptions {
  enabled?: boolean;
  refetchOnMount?: boolean;
}

interface UseApiResult<T> {
  data: T | null;
  meta: ApiMeta | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useApi<T>(
  fetcher: () => Promise<ApiResponse<T>>,
  deps: unknown[] = [],
  options: UseApiOptions = {}
): UseApiResult<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetcher();
      if (mountedRef.current) {
        setData(res.data);
        setMeta(res.meta || null);
      }
    } catch (err) {
      if (mountedRef.current) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
        }
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  return { data, meta, isLoading, error, refetch: fetchData };
}

/**
 * Project-local mutation hook.
 *
 * Returns `{ mutate, isLoading, error }` where `mutate(input)` resolves
 * to `TData | null` (null = the request failed; check `error` state).
 *
 * Default behaviour on failure: show a toast with the error message.
 * This is intentional — a long-standing class of bugs in this codebase
 * came from callers writing `const r = await mutate(x); if (r) { ... }`
 * and not handling the falsy branch, which silently swallowed real
 * failures (Phase 23 — see `gentle-humming-fairy.md` for the dispute
 * resolve / send-message bug it caused in prod).
 *
 * To opt OUT of the default toast (e.g. when the caller handles errors
 * inline in the UI), pass `{ onError: () => {} }`. The hook only fires
 * the default toast when `options.onError` is NOT provided.
 *
 * Optional `onSuccess(data)` runs after a successful mutation — handy
 * for cache invalidation, navigation, etc.
 */
export function useMutation<TData, TInput = void>(
  mutator: (input: TInput) => Promise<ApiResponse<TData>>,
  options?: {
    onError?: (message: string) => void;
    onSuccess?: (data: TData) => void;
  }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onErrorRef = useRef(options?.onError);
  const onSuccessRef = useRef(options?.onSuccess);
  onErrorRef.current = options?.onError;
  onSuccessRef.current = options?.onSuccess;

  const mutate = useCallback(
    async (input: TInput): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await mutator(input);
        onSuccessRef.current?.(res.data);
        return res.data;
      } catch (err) {
        const message = err instanceof ApiClientError
          ? err.message
          : 'An unexpected error occurred';
        setError(message);
        if (onErrorRef.current) {
          // Caller provided custom handler — they own the UX.
          onErrorRef.current(message);
        } else {
          // No custom handler — show a toast so the failure is loud.
          // This catches the entire class of "user clicks button, nothing
          // happens" bugs that previously came from callers checking
          // `if (result)` without an else branch.
          toast.error(message);
        }
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [mutator]
  );

  return { mutate, isLoading, error };
}
