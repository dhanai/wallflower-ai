'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';

export type UserRole = 'admin' | 'user' | null;

interface UseUserRoleOptions {
  /** Optional role from server render to hydrate initial state. */
  initialRole?: UserRole;
  /** Whether to skip fetching (e.g., when unauthenticated). */
  enabled?: boolean;
}

interface UseUserRoleResult {
  role: UserRole;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

let cachedRole: UserRole | undefined = undefined;
let cachedError: string | null = null;
let loadingPromise: Promise<UserRole | null> | null = null;
const listeners = new Set<(role: UserRole, error: string | null) => void>();

const notify = (role: UserRole, error: string | null) => {
  cachedRole = role;
  cachedError = error;
  listeners.forEach(listener => listener(role, error));
};

const fetchRoleFromApi = async (): Promise<UserRole | null> => {
  try {
    const data = await apiClient.get<{ role: UserRole }>('/api/auth/user-role');
    const role = data.role ?? null;
    notify(role, null);
    return role;
  } catch (err) {
    const apiError = err as ApiError;

    if (apiError.status === 401) {
      notify(null, null);
      return null;
    }

    notify(cachedRole ?? null, apiError.message);
    throw apiError;
  }
};

const loadRole = async (force = false): Promise<UserRole | null> => {
  if (!force && cachedRole !== undefined) {
    return cachedRole;
  }

  if (!loadingPromise || force) {
    loadingPromise = fetchRoleFromApi().finally(() => {
      loadingPromise = null;
    });
  }

  return loadingPromise;
};

export function setCachedUserRole(role: UserRole) {
  notify(role, null);
}

export function useUserRole(options: UseUserRoleOptions = {}): UseUserRoleResult {
  const { initialRole = null, enabled = true } = options;
  const initial = cachedRole !== undefined ? cachedRole : initialRole;
  const [role, setRole] = useState<UserRole>(initial ?? null);
  const [loading, setLoading] = useState<boolean>(enabled && cachedRole === undefined && initialRole === null);
  const [error, setError] = useState<string | null>(cachedError);

  const fetchRole = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const result = await loadRole(true);
      if (result !== undefined) {
        setRole(result);
      }
      setError(null);
    } catch (err) {
      const apiError = err as ApiError;

      if (apiError.status === 401) {
        setRole(null);
        setError(null);
        return;
      }

      setError(apiError.message);
      console.error('useUserRole: failed to fetch user role', apiError);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    // Avoid refetch when initialRole provided and not null
    if (cachedRole === undefined && initialRole === null) {
      setLoading(true);
      loadRole().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [enabled, initialRole]);

  useEffect(() => {
    const listener = (newRole: UserRole, newError: string | null) => {
      setRole(newRole);
      setError(newError);
    };

    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    if (initialRole !== undefined && initialRole !== null) {
      notify(initialRole, null);
    }
  }, [initialRole]);

  return {
    role,
    loading,
    error,
    refresh: fetchRole,
  };
}


