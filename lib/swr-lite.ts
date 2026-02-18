'use client';

import { useCallback, useEffect, useState } from 'react';

type CacheEntry<T> = {
  data?: T;
  error?: unknown;
  updatedAt: number;
  promise?: Promise<T>;
};

type SWROptions = {
  staleTime?: number;
  revalidateOnMount?: boolean;
  keepPreviousData?: boolean;
};

const cache = new Map<string, CacheEntry<unknown>>();
const listeners = new Map<string, Set<() => void>>();

const now = () => Date.now();

const getEntry = <T,>(key: string): CacheEntry<T> | undefined => {
  return cache.get(key) as CacheEntry<T> | undefined;
};

const notify = (key: string) => {
  const subscribers = listeners.get(key);
  if (!subscribers || subscribers.size === 0) return;

  subscribers.forEach((listener) => {
    listener();
  });
};

const isFresh = (entry: CacheEntry<unknown> | undefined, staleTime: number) => {
  if (!entry) return false;
  return now() - entry.updatedAt < staleTime;
};

const runFetch = async <T,>(key: string, fetcher: (key: string) => Promise<T>) => {
  const existing = getEntry<T>(key);
  if (existing?.promise) {
    return existing.promise;
  }

  const promise = fetcher(key)
    .then((data) => {
      cache.set(key, {
        data,
        error: undefined,
        updatedAt: now(),
        promise: undefined,
      });
      notify(key);
      return data;
    })
    .catch((error) => {
      const prev = getEntry<T>(key);
      cache.set(key, {
        data: prev?.data,
        error,
        updatedAt: now(),
        promise: undefined,
      });
      notify(key);
      throw error;
    });

  cache.set(key, {
    data: existing?.data,
    error: undefined,
    updatedAt: existing?.updatedAt || 0,
    promise,
  });

  notify(key);
  return promise;
};

export function preloadSWRLite<T>(
  key: string,
  fetcher: (key: string) => Promise<T>,
  options: SWROptions = {}
) {
  const staleTime = options.staleTime ?? 0;
  const entry = getEntry<T>(key);

  if (isFresh(entry, staleTime)) {
    return;
  }

  void runFetch(key, fetcher).catch(() => {
    // ignore preload failures
  });
}

export function useSWRLite<T>(
  key: string | null,
  fetcher: (key: string) => Promise<T>,
  options: SWROptions = {}
) {
  const staleTime = options.staleTime ?? 0;
  const revalidateOnMount = options.revalidateOnMount ?? true;
  const keepPreviousData = options.keepPreviousData ?? false;
  const [, setTick] = useState(0);
  const [previousData, setPreviousData] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!key) return;

    const listener = () => {
      setTick((value) => value + 1);
    };

    let set = listeners.get(key);
    if (!set) {
      set = new Set();
      listeners.set(key, set);
    }

    set.add(listener);

    return () => {
      const active = listeners.get(key);
      if (!active) return;
      active.delete(listener);
      if (active.size === 0) {
        listeners.delete(key);
      }
    };
  }, [key]);

  useEffect(() => {
    if (!key) return;

    const entry = getEntry<T>(key);
    const needsRefresh = revalidateOnMount
      ? !entry || !isFresh(entry, staleTime)
      : !entry;

    if (needsRefresh) {
      void runFetch(key, fetcher).catch(() => {
        // errors are surfaced via cache entry
      });
    }
  }, [fetcher, key, revalidateOnMount, staleTime]);

  const entry = key ? getEntry<T>(key) : undefined;

  useEffect(() => {
    if (entry?.data !== undefined) {
      setPreviousData(entry.data);
    }
  }, [entry?.data]);

  useEffect(() => {
    if (!key) {
      setPreviousData(undefined);
    }
  }, [key]);

  const mutate = useCallback(async () => {
    if (!key) return undefined;
    return runFetch(key, fetcher);
  }, [fetcher, key]);

  const resolvedData = entry?.data ?? (keepPreviousData ? previousData : undefined);

  return {
    data: resolvedData,
    error: entry?.error,
    isLoading: Boolean(key) && !resolvedData && !entry?.error,
    isValidating: Boolean(entry?.promise),
    mutate,
  };
}
