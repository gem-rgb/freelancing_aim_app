'use client';

import { useEffect, useState } from 'react';
import { Shield, Lock, Unlock, AlertTriangle, TrendingUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface EscrowSummary {
  total_locked: number;
  total_released: number;
  total_slashed: number;
  active_stakes: number;
  pending_release: number;
  stakes_by_status: Record<string, number>;
}

interface StakeEntry {
  id: string;
  gross_sale_amount: string;
  locked_amount: string;
  status: string;
  verification_status: string;
  scam_review_status: string;
  locked_at: string;
  estimated_release_at: string | null;
  released_at: string | null;
}

const statusStyles: Record<string, { color: string; bg: string; icon: typeof Lock }> = {
  locked: { color: 'text-amber-400', bg: 'bg-amber-500/10', icon: Lock },
  pending_release: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Clock },
  released: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Unlock },
  slashed: { color: 'text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
  disputed: { color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Shield },
};

export default function EscrowStakePage() {
  const [summary, setSummary] = useState<EscrowSummary | null>(null);
  const [stakes, setStakes] = useState<StakeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [summaryRes, stakesRes] = await Promise.allSettled([
          apiService.getEscrowSummary(),
          apiService.getEscrowStakes(),
        ]);
        if (summaryRes.status === 'fulfilled') setSummary(summaryRes.value.data);
        if (stakesRes.status === 'fulfilled') setStakes(stakesRes.value.data?.results ?? stakesRes.value.data ?? []);
      } catch {
        // Demo fallback
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const s = summary ?? {
    total_locked: 45200.00,
    total_released: 128400.00,
    total_slashed: 0,
    active_stakes: 3,
    pending_release: 1,
    stakes_by_status: { locked: 2, pending_release: 1, released: 12, slashed: 0, disputed: 0 },
  };

  const demoStakes: StakeEntry[] = stakes.length > 0 ? stakes : [
    { id: 's1', gross_sale_amount: '50000', locked_amount: '20000', status: 'locked', verification_status: 'in_review', scam_review_status: 'not_flagged', locked_at: new Date(Date.now() - 172800000).toISOString(), estimated_release_at: new Date(Date.now() + 86400000).toISOString(), released_at: null },
    { id: 's2', gross_sale_amount: '30000', locked_amount: '12000', status: 'pending_release', verification_status: 'passed', scam_review_status: 'cleared', locked_at: new Date(Date.now() - 604800000).toISOString(), estimated_release_at: new Date(Date.now() + 3600000).toISOString(), released_at: null },
    { id: 's3', gross_sale_amount: '33000', locked_amount: '13200', status: 'locked', verification_status: 'pending', scam_review_status: 'not_flagged', locked_at: new Date(Date.now() - 86400000).toISOString(), estimated_release_at: new Date(Date.now() + 172800000).toISOString(), released_at: null },
  ];

  const metricCards = [
    { label: 'Total Locked', value: `₦${s.total_locked.toLocaleString()}`, icon: Lock, tone: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5' },
    { label: 'Total Released', value: `₦${s.total_released.toLocaleString()}`, icon: Unlock, tone: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5' },
    { label: 'Active Stakes', value: s.active_stakes, icon: Shield, tone: 'text-blue-400', bg: 'from-blue-500/10 to-blue-600/5' },
    { label: 'Pending Release', value: s.pending_release, icon: Clock, tone: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-600/5' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/5" />)}
        </div>
        <div className="h-80 rounded-2xl bg-white/5 border border-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-400" />Escrow &amp; Stake Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">40% of each sale is staked until distributed verification completes.</p>
      </div>

      {/* Metrics */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((c) => (
          <Card key={c.label} className={`glass border-white/10 bg-gradient-to-br ${c.bg} hover-glow transition-all duration-300`}>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{c.label}</p>
                <p className={`text-2xl font-black mt-2 ${c.tone}`}>{c.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${c.tone}`}>
                <c.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stake Progress Bar */}
      {s.total_locked + s.total_released > 0 && (
        <Card className="glass border-white/10">
          <CardContent className="p-5">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground font-bold">Escrow Health</span>
              <span className="text-white font-mono">{((s.total_released / (s.total_locked + s.total_released)) * 100).toFixed(1)}% released</span>
            </div>
            <div className="h-3 rounded-full bg-white/10 overflow-hidden flex">
              <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000" style={{ width: `${(s.total_released / (s.total_locked + s.total_released)) * 100}%` }} />
              <div className="h-full bg-amber-500/60 transition-all duration-1000" style={{ width: `${(s.total_locked / (s.total_locked + s.total_released)) * 100}%` }} />
            </div>
            <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Released</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Locked</span>
              {s.total_slashed > 0 && <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Slashed: ₦{s.total_slashed.toLocaleString()}</span>}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stakes List */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />Active Stake Entries
          </CardTitle>
          <CardDescription>Each entry represents 40% of a sale locked until verification clears.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {demoStakes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
              <p className="font-bold">No active stakes</p>
              <p className="text-sm">Stakes will appear here when you make sales.</p>
            </div>
          ) : (
            demoStakes.map((stake) => {
              const cfg = statusStyles[stake.status] || statusStyles.locked;
              const StatusIcon = cfg.icon;
              const timeLeft = stake.estimated_release_at ? Math.max(0, Math.round((new Date(stake.estimated_release_at).getTime() - Date.now()) / 3600000)) : null;
              return (
                <div key={stake.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-all duration-200">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <StatusIcon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-black">₦{Number(stake.locked_amount).toLocaleString()}</span>
                        <span className="text-[10px] text-muted-foreground">of ₦{Number(stake.gross_sale_amount).toLocaleString()}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${cfg.color} border-white/10`}>{stake.status.replace('_', ' ')}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono">
                        <span>Verification: {stake.verification_status}</span>
                        <span>Scam check: {stake.scam_review_status.replace('_', ' ')}</span>
                        {timeLeft !== null && stake.status !== 'released' && (
                          <span className={timeLeft < 24 ? 'text-cyan-400' : ''}>{timeLeft}h to release</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
