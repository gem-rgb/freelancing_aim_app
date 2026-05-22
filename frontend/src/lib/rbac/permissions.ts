import type { AppRole, Permission } from './types';

/** Role → default permissions (client-side feature gating; server must still enforce). */
const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  buyer: [
    'marketplace:read',
    'marketplace:purchase',
    'bounties:create',
    'bounties:read',
    'escrow:view_own',
    'chat:participant',
    'product_tracking:view_status',
    'fraud:submit_report',
    'ratings:view_trust',
    'ratings:vote',
  ],
  seller: [
    'marketplace:read',
    'marketplace:purchase',
    'bounties:create',
    'bounties:read',
    'listings:manage_own',
    'escrow:view_own',
    'escrow:manage_stakes',
    'chat:participant',
    'product_tracking:view_status',
    'fraud:view_alerts',
    'fraud:submit_report',
    'ratings:view_trust',
    'ratings:vote',
  ],
  manager: [
    'chat:participant',
    'verification:review_chunks',
    'verification:view_queue',
    'manager:onboarding',
    'manager:performance',
    'manager:trust_policy',
    'product_tracking:view_status',
    'fraud:view_alerts',
    'ratings:view_trust',
    'hiring:apply',
    'hiring:view_interviews',
    'task_engine:view_assigned',
    'task_engine:submit_review',
  ],
};

export function permissionsForRole(role: AppRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function roleHasPermission(role: AppRole, permission: Permission): boolean {
  return permissionsForRole(role).includes(permission);
}
