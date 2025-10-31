'use client';

import { useEffect, useState } from 'react';
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

export function useUserRole(options: UseUserRoleOptions = {}): UseUserRoleResult {
  const { initialRole = null, enabled = true } = options;
  const [role, setRole] = useState<UserRole>(initialRole ?? null);
  const [loading, setLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchRole = async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const data = await apiClient.get<{ role: UserRole }>('/api/auth/user-role');
      setRole(data.role ?? null);
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
  };

  useEffect(() => {
    if (!enabled) return;

    // Avoid refetch when initialRole provided and not null
    if (initialRole !== undefined && initialRole !== null) {
      setLoading(false);
      return;
    }

    fetchRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return {
    role,
    loading,
    error,
    refresh: fetchRole,
  };
}


