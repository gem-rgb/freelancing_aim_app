'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Shield, ArrowLeft } from 'lucide-react';

interface Tx {
  id: string;
  listing_title: string;
  amount: number;
  status: string;
  seller_username: string;
  buyer_username: string;
  created_at: string;
  listing_id?: string;
}

export default function BuyerEscrowPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getTransactions();
        const txns = res.data.results || res.data;
        const mine = (txns as Tx[]).filter((t) => t.buyer_username === user?.username && t.status === 'escrow');
        if (!cancelled) setRows(mine);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="text-muted-foreground" asChild>
          <Link href="/dashboard/buyer">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Command center
          </Link>
        </Button>
      </div>
      <Card className="glass border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <Shield className="w-5 h-5 text-cyan-400" />
            Escrow tracking
          </CardTitle>
          <CardDescription>
            Funds stay in escrow until release conditions are met on the server. This view mirrors your buyer-side transactions only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
          {!loading && rows.length === 0 && (
            <p className="text-muted-foreground text-sm">No active escrows. Purchases in progress will appear here.</p>
          )}
          {rows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <p className="font-bold text-white">{t.listing_title}</p>
                <p className="text-xs text-muted-foreground">Seller @{t.seller_username}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-white">₦{Number(t.amount).toLocaleString()}</p>
                <StatusBadge status="Pending" className="mt-1" />
              </div>
              <Button size="sm" variant="outline" className="border-white/15" asChild>
                <Link href={`/listing/${t.listing_id || ''}`}>Listing</Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
