'use client';

import { useState, useCallback, useEffect } from 'react';
import { EncryptionService } from '@/utils/encryption';

interface AsyncKeyGeneratorProps {
  onKeysGenerated: (keys: { publicKey: string; privateKey: string }) => void;
}

export function AsyncKeyGenerator({ onKeysGenerated }: AsyncKeyGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateKeys = useCallback(async () => {
    setIsGenerating(true);
    try {
      // Use setTimeout to defer heavy computation
      const keys = await new Promise<{ publicKey: string; privateKey: string }>((resolve) => {
        setTimeout(() => {
          const generatedKeys = EncryptionService.generateKeyPair();
          resolve(generatedKeys);
        }, 0);
      });
      onKeysGenerated(keys);
    } catch (error) {
      console.error('Failed to generate keys:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [onKeysGenerated]);

  useEffect(() => {
    generateKeys();
  }, [generateKeys]);

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        <span className="ml-2 text-sm text-gray-600">Generating encryption keys...</span>
      </div>
    );
  }

  return null;
}
