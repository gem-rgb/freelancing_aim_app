/**
 * Product fingerprinting & duplicate detection — service boundary for future ML/hash pipelines.
 */

export interface FingerprintInput {
  listingId?: string;
  filename: string;
  byteLength: number;
  /** SHA-256 of ciphertext or normalized plaintext hash from client when available. */
  contentSha256?: string;
  metadataJson?: Record<string, string | number | boolean>;
}

export interface FingerprintResult {
  fingerprintId: string;
  /** 0–1 confidence from future duplicate model; null until backend supplies it. */
  duplicateConfidence: number | null;
  lineageRootId: string | null;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
}

export interface ProductFingerprintPort {
  registerFingerprint(input: FingerprintInput): Promise<FingerprintResult>;
  getLineage(fingerprintId: string): Promise<{ nodes: Array<{ id: string; label: string }>; edges: Array<{ from: string; to: string }> }>;
  compareMetadata(a: FingerprintInput, b: FingerprintInput): Promise<{ distance: number; fields: string[] }>;
}

export class HttpProductFingerprintStub implements ProductFingerprintPort {
  async registerFingerprint(input: FingerprintInput): Promise<FingerprintResult> {
    const base = input.contentSha256 || `fp_${input.filename}_${input.byteLength}`;
    return {
      fingerprintId: base.slice(0, 24),
      duplicateConfidence: null,
      lineageRootId: null,
      verificationStatus: 'unverified',
    };
  }

  async getLineage(fingerprintId: string) {
    return {
      nodes: [{ id: fingerprintId, label: 'Origin' }],
      edges: [],
    };
  }

  async compareMetadata(a: FingerprintInput, b: FingerprintInput) {
    const fields: string[] = [];
    if (a.byteLength !== b.byteLength) fields.push('byteLength');
    if (a.filename !== b.filename) fields.push('filename');
    return { distance: fields.length, fields };
  }
}

let port: ProductFingerprintPort | null = null;

export function getProductFingerprintService(): ProductFingerprintPort {
  if (!port) port = new HttpProductFingerprintStub();
  return port;
}
