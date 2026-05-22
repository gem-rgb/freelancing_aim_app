/**
 * Seller sale stake rule: 40% of gross sale held until verification completes.
 * Amounts are illustrative until backend exposes explicit stake ledger fields.
 */
export const SELLER_SALE_STAKE_RATE = 0.4;

export type EscrowPhase = 'pending_payment' | 'in_escrow' | 'verification' | 'released' | 'disputed';

export interface SellerStakeLineItem {
  transactionId: string;
  grossAmount: number;
  lockedStake: number;
  /** Estimated release — replace with API timestamps when available. */
  estimatedReleaseAt?: string;
  verificationStatus: 'pending' | 'in_review' | 'passed' | 'failed';
  scamReviewStatus: 'not_flagged' | 'queued' | 'cleared' | 'escalated';
}

export function computeLockedStakeFromSale(grossAmount: number): number {
  return Math.round(grossAmount * SELLER_SALE_STAKE_RATE * 100) / 100;
}

export function buildStakeLineItems(
  sales: Array<{ id: string; amount: number; status: string; created_at?: string }>
): SellerStakeLineItem[] {
  return sales.map((s) => ({
    transactionId: s.id,
    grossAmount: Number(s.amount),
    lockedStake: computeLockedStakeFromSale(Number(s.amount)),
    verificationStatus: s.status === 'released' ? 'passed' : s.status === 'escrow' ? 'in_review' : 'pending',
    scamReviewStatus: 'not_flagged',
    estimatedReleaseAt: s.created_at,
  }));
}
