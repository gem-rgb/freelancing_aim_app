'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLoginDashboardPath, normalizeAppRole, type AppRole } from '@/lib/rbac';

/**
 * Redirects authenticated users away from a route group when their role does not match.
 * Staff users are sent to the admin dashboard when entering role dashboards.
 */
export function useRequireRole(expected: AppRole): void {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    if (user.is_staff) {
      router.replace('/admin/dashboard');
      return;
    }
    const role = normalizeAppRole(user);
    if (role !== expected) {
      router.replace(getPostLoginDashboardPath(user));
    }
  }, [expected, isAuthenticated, isLoading, router, user]);
}
