import type { UserLike } from './normalizeRole';
import { normalizeAppRole } from './normalizeRole';

/** First destination after successful user (non-staff) authentication. */
export function getPostLoginDashboardPath(user: UserLike | null | undefined): string {
  if (user?.is_staff) return '/admin/dashboard';
  const role = normalizeAppRole(user);
  if (role === 'seller') return '/dashboard/seller';
  if (role === 'manager') return '/dashboard/manager';
  return '/dashboard/buyer';
}
