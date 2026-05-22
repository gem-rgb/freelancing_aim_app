'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { normalizeAppRole, permissionsForRole, roleHasPermission, type AppRole, type Permission } from '@/lib/rbac';

export function usePermissions(): {
  role: AppRole;
  can: (p: Permission) => boolean;
  list: readonly Permission[];
} {
  const { user } = useAuth();
  const role = useMemo(() => normalizeAppRole(user ?? undefined), [user]);
  const list = useMemo(() => permissionsForRole(role), [role]);
  const can = useMemo(
    () => (p: Permission) => roleHasPermission(role, p),
    [role]
  );
  return { role, can, list };
}
