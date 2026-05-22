/**
 * High-level chat facade — UI and hooks should depend on this, not on axios/WebSocket directly.
 */
import type {
  DeviceSessionPort,
  EncryptedLocalStorePort,
  EndToEndEncryptionPort,
  SecureWebSocketPort,
  SessionKeyExchangePort,
  SessionKeyBundle,
} from './ports';
import { createChatSecurityStack } from './ports';

export type ChatRoomRef = { id: string; title?: string };

export interface SecureChatServiceConfig {
  e2e: EndToEndEncryptionPort;
  keyExchange: SessionKeyExchangePort;
  ws: SecureWebSocketPort;
  devices: DeviceSessionPort;
  store: EncryptedLocalStorePort;
}

export class SecureChatService {
  constructor(private readonly cfg: SecureChatServiceConfig) {}

  /** Prepare session material for a room — actual network I/O stays in transport layer. */
  async ensureSessionKeys(_roomId: string): Promise<SessionKeyBundle> {
    const { handshakePayload } = await this.cfg.keyExchange.initiateHandshake('peer');
    void handshakePayload;
    return this.cfg.keyExchange.completeHandshake(new Uint8Array(0));
  }

  async encryptOutboundMessage(roomId: string, body: string): Promise<Uint8Array> {
    const session = await this.ensureSessionKeys(roomId);
    const enc = new TextEncoder();
    return this.cfg.e2e.seal(enc.encode(body), session);
  }

  async persistRoomMetadata(roomId: string, meta: Record<string, unknown>): Promise<void> {
    await this.cfg.store.setJson('chat:rooms', roomId, meta);
  }
}

let singleton: SecureChatService | null = null;

export function getSecureChatService(): SecureChatService {
  if (!singleton) singleton = new SecureChatService(createChatSecurityStack());
  return singleton;
}

export type { SessionKeyBundle } from './ports';
