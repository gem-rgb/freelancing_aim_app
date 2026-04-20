import CryptoJS from 'crypto-js';
import NodeRSA from 'node-rsa';

export class EncryptionService {
  private static readonly AES_KEY_LENGTH = 32;
  private static readonly RSA_KEY_SIZE = 2048;
  private static keyCache = new Map<string, { publicKey: string; privateKey: string }>();

  // Generate RSA key pair (cached for performance)
  static generateKeyPair(): { publicKey: string; privateKey: string } {
    const cacheKey = 'default_keypair';
    if (this.keyCache.has(cacheKey)) {
      return this.keyCache.get(cacheKey)!;
    }

    const key = new NodeRSA({ b: this.RSA_KEY_SIZE });
    const keyPair = {
      publicKey: key.exportKey('public'),
      privateKey: key.exportKey('private')
    };
    
    this.keyCache.set(cacheKey, keyPair);
    return keyPair;
  }

  // Encrypt content with AES
  static encryptAES(content: string, key: string): { encrypted: string; iv: string } {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(content, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return {
      encrypted: encrypted.toString(),
      iv: iv.toString(CryptoJS.enc.Hex)
    };
  }

  // Decrypt content with AES
  static decryptAES(encryptedContent: string, key: string, iv: string): string {
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, key, {
      iv: CryptoJS.enc.Hex.parse(iv),
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return decrypted.toString(CryptoJS.enc.Utf8);
  }

  // Encrypt AES key with RSA public key
  static encryptRSA(content: string, publicKey: string): string {
    const key = new NodeRSA();
    key.importKey(publicKey, 'public');
    return key.encrypt(content, 'base64');
  }

  // Decrypt AES key with RSA private key
  static decryptRSA(encryptedContent: string, privateKey: string): string {
    const key = new NodeRSA();
    key.importKey(privateKey, 'private');
    return key.decrypt(encryptedContent, 'utf8');
  }

  // Generate random AES key
  static generateAESKey(): string {
    return CryptoJS.lib.WordArray.random(this.AES_KEY_LENGTH).toString(CryptoJS.enc.Hex);
  }

  // Generate hash of content
  static generateHash(content: string): string {
    return CryptoJS.SHA256(content).toString(CryptoJS.enc.Hex);
  }

  // Encrypt content for multiple recipients
  static encryptForRecipients(
    content: string, 
    recipients: Array<{ publicKey: string; userId: string }>
  ): {
    encryptedContent: string;
    iv: string;
    encryptedKeys: Array<{ userId: string; encryptedKey: string }>;
  } {
    const aesKey = this.generateAESKey();
    const { encrypted, iv } = this.encryptAES(content, aesKey);
    
    const encryptedKeys = recipients.map(recipient => ({
      userId: recipient.userId,
      encryptedKey: this.encryptRSA(aesKey, recipient.publicKey)
    }));

    return {
      encryptedContent: encrypted,
      iv,
      encryptedKeys
    };
  }

  // Decrypt content from sender
  static decryptFromSender(
    encryptedContent: string,
    iv: string,
    encryptedKey: string,
    privateKey: string
  ): string {
    const aesKey = this.decryptRSA(encryptedKey, privateKey);
    return this.decryptAES(encryptedContent, aesKey, iv);
  }

  // Store private key securely (in real app, use secure storage)
  static storePrivateKey(privateKey: string, userId: string): void {
    if (typeof window !== 'undefined') {
      const encryptedKey = this.encryptAES(privateKey, userId);
      localStorage.setItem(`private_key_${userId}`, encryptedKey.encrypted);
      localStorage.setItem(`private_key_${userId}_iv`, encryptedKey.iv);
    }
  }

  // Retrieve private key securely
  static retrievePrivateKey(userId: string): string | null {
    if (typeof window !== 'undefined') {
      const encrypted = localStorage.getItem(`private_key_${userId}`);
      const iv = localStorage.getItem(`private_key_${userId}_iv`);
      
      if (encrypted && iv) {
        try {
          return this.decryptAES(encrypted, userId, iv);
        } catch (error) {
          console.error('Failed to decrypt private key:', error);
          return null;
        }
      }
    }
    return null;
  }

  // Clear stored keys
  static clearStoredKeys(userId: string): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`private_key_${userId}`);
      localStorage.removeItem(`private_key_${userId}_iv`);
    }
  }
}
