'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wallet } from 'lucide-react';

export default function BuyerWalletPage() {
  const { user } = useAuth();
  const bal = Number(user?.wallet_balance ?? 0);
  const frozen = Number(user?.frozen_balance ?? 0);

  return (
    <div className="space-y-6 max-w-2xl animate-fade-in">
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white font-black">
            <Wallet className="w-5 h-5 text-cyan-400" />
            Wallet
          </CardTitle>
          <CardDescription>Balances come from your authenticated profile (`/auth/profile/`).</CardDescription>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Available</p>
            <p className="text-3xl font-black text-white mt-2">₦{bal.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Frozen / escrow</p>
            <p className="text-3xl font-black text-cyan-300 mt-2">₦{frozen.toLocaleString()}</p>
          </div>
          {user?.wallet_address && (
            <div className="sm:col-span-2 text-xs text-muted-foreground font-mono break-all">Address: {user.wallet_address}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
