'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquareLock } from 'lucide-react';
import { getSecureChatService } from '@/services/encrypted-chat';

export default function BuyerSecureCommsPage() {
  const stack = getSecureChatService();

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <Card className="glass border-violet-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <MessageSquareLock className="w-5 h-5 text-violet-400" />
            Secure messaging architecture
          </CardTitle>
          <CardDescription>
            UI routes through `SecureChatService`, which composes encryption ports (`EndToEndEncryptionPort`, `SessionKeyExchangePort`,
            `SecureWebSocketPort`, `DeviceSessionPort`, `EncryptedLocalStorePort`). Replace noop adapters with real WebCrypto / transport
            implementations without changing this page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p className="text-white font-bold text-xs uppercase tracking-widest">Runtime check</p>
          <p>
            Service instance ready: <span className="text-cyan-400 font-mono text-xs">{String(Boolean(stack))}</span>
          </p>
          <p className="text-white font-bold text-xs uppercase tracking-widest pt-2">Operational chat</p>
          <p>Existing rooms and REST/WebSocket flows remain in `/chat` until the secure stack is wired to the backend envelope format.</p>
          <Button className="rounded-full bg-violet-600 hover:bg-violet-700 font-bold" asChild>
            <Link href="/chat">Open conversations</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
