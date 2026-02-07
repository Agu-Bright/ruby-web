'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

export function useMutation<TData, TInput = void>(
  mutator: (input: TInput) => Promise<ApiResponse<TData>>
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (input: TInput): Promise<TData | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await mutator(input);
        return res.data;
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred');
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
