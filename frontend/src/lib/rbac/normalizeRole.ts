import type { AppRole } from './types';

export interface UserLike {
  user_type?: string;
  is_staff?: boolean;
}

/** Maps API `user_type` string to `AppRole`; unknown values default to buyer for safe routing. */
export function normalizeAppRole(user: UserLike | null | undefined): AppRole {
  const t = user?.user_type?.toLowerCase();
  if (t === 'seller') return 'seller';
  if (t === 'manager') return 'manager';
  return 'buyer';
}
