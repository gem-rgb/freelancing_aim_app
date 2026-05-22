/**
 * RBAC types — aligned with backend `User.user_type` plus staff for admin surfaces.
 * Backend: `authentication.User.USER_TYPE_CHOICES` (buyer | seller | manager).
 */
export type AppRole = 'buyer' | 'seller' | 'manager';

export type Permission =
  | 'marketplace:read'
  | 'marketplace:purchase'
  | 'bounties:create'
  | 'bounties:read'
  | 'listings:manage_own'
  | 'escrow:view_own'
  | 'escrow:manage_stakes'
  | 'chat:participant'
  | 'verification:review_chunks'
  | 'verification:view_queue'
  | 'manager:onboarding'
  | 'manager:performance'
  | 'manager:trust_policy'
  | 'product_tracking:view_status'
  | 'fraud:view_alerts'
  | 'fraud:submit_report'
  | 'ratings:view_trust'
  | 'ratings:vote'
  | 'hiring:apply'
  | 'hiring:view_interviews'
  | 'task_engine:view_assigned'
  | 'task_engine:submit_review';
