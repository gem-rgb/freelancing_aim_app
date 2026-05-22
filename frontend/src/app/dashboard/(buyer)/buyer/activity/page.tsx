'use client';

import { useEffect, useState } from 'react';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface Tx {
  id: string;
  listing_title: string;
  status: string;
  created_at: string;
  buyer_username: string;
}

export default function BuyerActivityPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Tx[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiService.getTransactions();
        const txns = res.data.results || res.data;
        const mine = (txns as Tx[]).filter((t) => t.buyer_username === user?.username);
        if (!cancelled) setItems(mine.slice(0, 30));
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.username]);

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <Activity className="w-5 h-5 text-cyan-400" />
            Activity timeline
          </CardTitle>
          <CardDescription>Recent purchase-side transactions from `/transactions/`.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
          {items.map((t) => (
            <div key={t.id} className="flex gap-4 border-l-2 border-cyan-500/40 pl-4 py-1">
              <div className="text-[10px] text-muted-foreground font-mono w-24 shrink-0">
                {new Date(t.created_at).toLocaleString()}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{t.listing_title}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-tighter">{t.status}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
