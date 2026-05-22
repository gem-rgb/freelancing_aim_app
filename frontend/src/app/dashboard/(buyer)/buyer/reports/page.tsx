'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function BuyerReportsPage() {
  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <Card className="glass border-red-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Scam & abuse reports
          </CardTitle>
          <CardDescription>
            File structured reports through existing bounty and dispute flows until a dedicated reporting API is added. This page centralizes entry points for buyers.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" className="border-white/15 font-bold" asChild>
            <Link href="/bounties">Post bounty on bad actor</Link>
          </Button>
          <Button variant="outline" className="border-white/15 font-bold" asChild>
            <Link href="/disputes">Dispute resolution hub</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
