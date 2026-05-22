'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSecureChatService } from '@/services/encrypted-chat';

export default function ManagerInternalCommsPage() {
  const svc = getSecureChatService();

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <Card className="glass border-violet-500/20">
        <CardHeader>
          <CardTitle className="text-white font-black">Internal secure comms</CardTitle>
          <CardDescription>
            Reuses the same `SecureChatService` stack as buyer/seller secure surfaces. Route to hardened rooms when backend exposes manager-only channels.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Stack ready: {String(Boolean(svc))}</p>
          <Button variant="outline" className="border-violet-500/40 text-violet-100 font-bold" asChild>
            <Link href="/chat">Temporary: general chat</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
