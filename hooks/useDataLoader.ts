'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api/client';

interface UseDataLoaderOptions<T> {
  fetcher: () => Promise<T>;
  initialData: T;
  immediate?: boolean;
  timeoutMs?: number;
  onError?: (error: ApiError | Error) => void;
}

interface UseDataLoaderResult<T> {
  data: T;
  setData: React.Dispatch<React.SetStateAction<T>>;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useDataLoader<T>(options: UseDataLoaderOptions<T>): UseDataLoaderResult<T> {
  const { fetcher, initialData, immediate = true, timeoutMs = 10000, onError } = options;

  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState<boolean>(immediate);
  const [error, setError] = useState<string | null>(null);
  const isMountedRef = useRef(true);
  const initialFetchTriggeredRef = useRef(false);

  const load = useCallback(async () => {
    console.log('[useDataLoader] load start');
    setLoading(true);
    setError(null);

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error('Request timed out'));
        }, timeoutMs);
      });

      const result = await Promise.race([fetcher(), timeoutPromise]);

      if (!isMountedRef.current) return;

      setData(result as T);
      console.log('[useDataLoader] load success');
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage = err instanceof ApiError ? err.message : (err as Error).message;
      setError(errorMessage);
      console.error('[useDataLoader] load error', err);
      onError?.(err as ApiError | Error);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (isMountedRef.current) {
        setLoading(false);
        console.log('[useDataLoader] load end');
      }
    }
  }, [fetcher, onError, timeoutMs]);

  useEffect(() => {
    if (immediate && !initialFetchTriggeredRef.current) {
      initialFetchTriggeredRef.current = true;
      load();
    }
  }, [immediate, load]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    setData,
    loading,
    error,
    refresh: load,
  };
}


