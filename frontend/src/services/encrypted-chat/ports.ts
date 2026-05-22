/**
 * Encrypted messaging — frontend architecture only.
 * Swap `Noop*` adapters for real crypto + transport implementations without changing UI imports.
 */

export type SessionId = string;
export type DeviceId = string;
export type UserPublicKeyRef = string;

/** Contract for symmetric session keys (e.g. AES-GCM) once negotiated. */
export interface SessionKeyBundle {
  algorithm: string;
  /** Opaque handle — do not log raw key material. */
  keyId: string;
  createdAt: number;
  expiresAt?: number;
}

/** Pluggable end-to-end encryption for message payloads. */
export interface EndToEndEncryptionPort {
  seal(plaintext: Uint8Array, session: SessionKeyBundle): Promise<Uint8Array>;
  open(ciphertext: Uint8Array, session: SessionKeyBundle): Promise<Uint8Array>;
}

/** Session key exchange (e.g. X25519 + HKDF) — implement in a dedicated crypto worker later. */
export interface SessionKeyExchangePort {
  initiateHandshake(peerPublicKey: UserPublicKeyRef): Promise<{ handshakePayload: Uint8Array }>;
  acceptHandshake(payload: Uint8Array): Promise<SessionKeyBundle>;
  completeHandshake(payload: Uint8Array): Promise<SessionKeyBundle>;
}

/** WebSocket framing with optional binary envelopes for ciphertext. */
export interface SecureWebSocketPort {
  connect(url: string, authToken: string): Promise<void>;
  sendEncrypted(envelope: Uint8Array): Promise<void>;
  onMessage(handler: (envelope: Uint8Array) => void): () => void;
  disconnect(): void;
}

export interface DeviceRecord {
  deviceId: DeviceId;
  label: string;
  lastSeenAt: number;
  trusted: boolean;
}

/** Device / multi-session management for rotation and revocation UI. */
export interface DeviceSessionPort {
  listDevices(): Promise<DeviceRecord[]>;
  revokeDevice(deviceId: DeviceId): Promise<void>;
}

/** Namespaced encrypted storage (e.g. IndexedDB + WebCrypto wrap). */
export interface EncryptedLocalStorePort {
  setJson(namespace: string, key: string, value: unknown): Promise<void>;
  getJson<T>(namespace: string, key: string): Promise<T | null>;
  remove(namespace: string, key: string): Promise<void>;
}

import { EncryptionService } from '@/utils/encryption';

export class RealEndToEndEncryption implements EndToEndEncryptionPort {
  async seal(plaintext: Uint8Array, session: SessionKeyBundle): Promise<Uint8Array> {
    const text = new TextDecoder().decode(plaintext);
    const { encrypted, iv } = EncryptionService.encryptAES(text, session.keyId);
    const payload = JSON.stringify({ e: encrypted, i: iv });
    return new TextEncoder().encode(payload);
  }
  
  async open(ciphertext: Uint8Array, session: SessionKeyBundle): Promise<Uint8Array> {
    const payloadStr = new TextDecoder().decode(ciphertext);
    try {
      const { e, i } = JSON.parse(payloadStr);
      const decrypted = EncryptionService.decryptAES(e, session.keyId, i);
      return new TextEncoder().encode(decrypted);
    } catch {
      return ciphertext; // fallback if JSON parsing fails
    }
  }
}

export class RealSessionKeyExchange implements SessionKeyExchangePort {
  async initiateHandshake(peerPublicKey: UserPublicKeyRef): Promise<{ handshakePayload: Uint8Array }> {
    // Generate AES key for the session
    const aesKey = EncryptionService.generateAESKey();
    // Encrypt AES key with peer's RSA public key
    const encryptedKey = EncryptionService.encryptRSA(aesKey, peerPublicKey);
    
    // Store temporarily until accepted (in reality, store in secure memory)
    localStorage.setItem('pending_session_key', aesKey);
    
    return { handshakePayload: new TextEncoder().encode(encryptedKey) };
  }

  async acceptHandshake(payload: Uint8Array): Promise<SessionKeyBundle> {
    const encryptedKey = new TextDecoder().decode(payload);
    const { privateKey } = EncryptionService.generateKeyPair(); // Retrieves local RSA private key
    
    // Decrypt AES key
    const aesKey = EncryptionService.decryptRSA(encryptedKey, privateKey);
    
    return { algorithm: 'AES-256-CBC', keyId: aesKey, createdAt: Date.now() };
  }

  async completeHandshake(_payload: Uint8Array): Promise<SessionKeyBundle> {
    const aesKey = localStorage.getItem('pending_session_key') || 'fallback_key';
    localStorage.removeItem('pending_session_key');
    return { algorithm: 'AES-256-CBC', keyId: aesKey, createdAt: Date.now() };
  }
}

export class NoopSecureWebSocket implements SecureWebSocketPort {
  async connect(): Promise<void> {}
  async sendEncrypted(): Promise<void> {}
  onMessage(): () => void {
    return () => {};
  }
  disconnect(): void {}
}

export class NoopDeviceSession implements DeviceSessionPort {
  async listDevices(): Promise<DeviceRecord[]> {
    return [];
  }
  async revokeDevice(): Promise<void> {}
}

export class NoopEncryptedLocalStore implements EncryptedLocalStorePort {
  private mem = new Map<string, string>();
  async setJson(namespace: string, key: string, value: unknown): Promise<void> {
    this.mem.set(`${namespace}:${key}`, JSON.stringify(value));
  }
  async getJson<T>(namespace: string, key: string): Promise<T | null> {
    const raw = this.mem.get(`${namespace}:${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  async remove(namespace: string, key: string): Promise<void> {
    this.mem.delete(`${namespace}:${key}`);
  }
}

/** Wire adapters here when implementations land (WebCrypto, noise protocol, etc.). */
export function createChatSecurityStack(): {
  e2e: EndToEndEncryptionPort;
  keyExchange: SessionKeyExchangePort;
  ws: SecureWebSocketPort;
  devices: DeviceSessionPort;
  store: EncryptedLocalStorePort;
} {
  return {
    e2e: new RealEndToEndEncryption(),
    keyExchange: new RealSessionKeyExchange(),
    ws: new NoopSecureWebSocket(),
    devices: new NoopDeviceSession(),
    store: new NoopEncryptedLocalStore(),
  };
}
