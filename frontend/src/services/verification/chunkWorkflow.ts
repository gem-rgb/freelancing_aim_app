/**
 * Distributed verification — UI state and API shapes for chunk workflow.
 * ML / AI engines can plug in as additional `VerifierEngine` implementations later.
 */

export type VerifierEngineKind = 'human_manager' | 'rules_engine' | 'ml_model' | 'consensus';

export interface ChunkAssignment {
  id: string;
  listingOrJobRef: string;
  chunkIndex: number;
  /** Deliberately opaque — managers never see full plaintext in this model. */
  ciphertextPreviewRef: string;
  assignedAt: string;
  dueAt?: string;
  randomizedBatchLabel: string;
}

export type ChunkDecision = 'clean' | 'suspicious' | 'fraud_signal' | 'escalate';

export interface ChunkReviewSubmission {
  assignmentId: string;
  decision: ChunkDecision;
  score: number;
  notes?: string;
}

export interface VerificationConsensus {
  assignmentId: string;
  aggregateScore: number;
  status: 'open' | 'consensus_reached' | 'split_verdict' | 'escalated';
}

/** Optional future hook for automated scoring services. */
export interface FraudScoringPort {
  scoreChunk(meta: { assignmentId: string; featuresVersion: string }): Promise<{ score: number; modelId: string }>;
}

export class NoopFraudScoring implements FraudScoringPort {
  async scoreChunk(): Promise<{ score: number; modelId: string }> {
    return { score: 0, modelId: 'noop' };
  }
}
