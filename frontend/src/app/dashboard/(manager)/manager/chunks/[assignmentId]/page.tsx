'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Lock, Unlock, FileCheck, ShieldAlert } from 'lucide-react';
import type { ChunkDecision } from '@/services/verification';
import { EncryptionService } from '@/utils/encryption';
import apiService from '@/utils/api';

export default function ManagerChunkReviewPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params?.assignmentId as string;
  const [decision, setDecision] = useState<ChunkDecision | null>(null);
  const [notes, setNotes] = useState('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Mock encrypted payload that would normally be fetched from task details
  const mockEncryptedPayload = {
    content: "U2FsdGVkX1+vGg3...", // Base64 ciphertext placeholder
    iv: "abcdef1234567890",
    encryptedSessionKey: "RSA_ENCRYPTED_KEY_STRING"
  };

  const handleDecrypt = () => {
    setIsDecrypting(true);
    // Simulate decryption process via RSA -> AES
    setTimeout(() => {
      // In production:
      // 1. Get Manager's private RSA key from secure storage
      // 2. Decrypt the session key: EncryptionService.decryptRSA(mockEncryptedPayload.encryptedSessionKey, privateKey)
      // 3. Decrypt payload: EncryptionService.decryptAES(mockEncryptedPayload.content, aesKey, mockEncryptedPayload.iv)
      
      setDecryptedContent("DECRYPTED CHUNK: ... [The product contains a python script that attempts to copy local browser cookies and transmit them to an external IP] ... End of chunk.");
      setIsDecrypting(false);
    }, 800);
  };

  const handleSubmit = async () => {
    if (!decision) return;
    setIsSubmitting(true);
    try {
      // Map decision to score
      let score = 50;
      if (decision === 'clean') score = 100;
      if (decision === 'suspicious') score = 30;
      if (decision === 'fraud_signal' || decision === 'escalate') score = 0;

      await apiService.submitTaskReview(assignmentId, {
        decision,
        score,
        notes,
        duration_minutes: 5
      });
      router.push('/dashboard/manager/verification-queue');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <Card className="glass border-violet-500/20">
        <CardHeader>
          <CardTitle className="text-white font-black flex items-center gap-2">
            <Lock className="w-5 h-5 text-violet-400" /> Secure Chunk Review
          </CardTitle>
          <CardDescription>
            Assignment <span className="font-mono text-violet-300">{assignmentId}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-2xl border border-white/10 bg-black/40 p-6 text-sm">
            {!decryptedContent ? (
              <div className="text-center py-8">
                <Lock className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400 mb-4">Payload is AES-256 encrypted. Private key required.</p>
                <Button 
                  onClick={handleDecrypt} 
                  disabled={isDecrypting}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Unlock className="w-4 h-4 mr-2" />
                  {isDecrypting ? 'Decrypting...' : 'Decrypt Locally'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-emerald-400 font-bold flex items-center gap-2">
                    <Unlock className="w-4 h-4" /> Decrypted Payload
                  </span>
                  <span className="text-xs font-mono text-slate-500">AES-256-CBC</span>
                </div>
                <div className="p-4 bg-white/5 rounded-lg font-mono text-slate-300">
                  {decryptedContent}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-bold text-sm">Verification Decision</h3>
            <div className="flex flex-wrap gap-2">
              {(['clean', 'suspicious', 'fraud_signal', 'escalate'] as ChunkDecision[]).map((d) => (
                <Button
                  key={d}
                  type="button"
                  variant={decision === d ? 'default' : 'outline'}
                  className={decision === d ? 'bg-violet-600' : 'border-white/15 text-slate-300'}
                  onClick={() => setDecision(d)}
                >
                  {d === 'clean' && <FileCheck className="w-4 h-4 mr-2" />}
                  {(d === 'fraud_signal' || d === 'escalate') && <ShieldAlert className="w-4 h-4 mr-2" />}
                  {d.toUpperCase()}
                </Button>
              ))}
            </div>
            
            <div className="space-y-2 mt-4">
              <label className="text-sm font-medium text-slate-300">Review Notes (Encrypted on submit)</label>
              <Textarea 
                placeholder="Detail your findings here. Only consensus engine and admins can read this."
                className="bg-white/5 border-white/10 text-white"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <Button 
            disabled={!decision || !decryptedContent || isSubmitting} 
            onClick={handleSubmit}
            className="w-full font-bold bg-violet-600 hover:bg-violet-700"
          >
            {isSubmitting ? 'Submitting to Consensus Engine...' : 'Submit Verification'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
