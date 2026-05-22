'use client';

import { useEffect, useState } from 'react';
import { BarChart3, TrendingUp, Eye, ShoppingCart, Star, Shield, Award, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface TrustProfile {
  trust_score: number;
  tier: string;
  successful_transactions: number;
  total_transactions: number;
  buyer_satisfaction_avg: number;
  escrow_completion_rate: number;
  dispute_frequency: number;
  badges: Array<{ badge_type: string; awarded_at: string }>;
}

const tierColors: Record<string, string> = {
  diamond: 'text-cyan-300', platinum: 'text-slate-300', gold: 'text-amber-400',
  silver: 'text-slate-400', bronze: 'text-blue-600', new: 'text-muted-foreground',
};

export default function SellerAnalyticsPage() {
  const [trust, setTrust] = useState<TrustProfile | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [trustRes, statsRes] = await Promise.allSettled([
          apiService.getMyTrustProfile(),
          apiService.getUserStats(),
        ]);
        if (trustRes.status === 'fulfilled') setTrust(trustRes.value.data);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      } catch { /* demo fallback */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const t = trust ?? {
    trust_score: 78.5, tier: 'gold', successful_transactions: 32, total_transactions: 35,
    buyer_satisfaction_avg: 4.6, escrow_completion_rate: 91.4, dispute_frequency: 5.7,
    badges: [{ badge_type: 'verified_seller', awarded_at: '' }, { badge_type: 'top_rated', awarded_at: '' }],
  };

  const successRate = t.total_transactions > 0 ? ((t.successful_transactions / t.total_transactions) * 100).toFixed(1) : '0';

  const metrics = [
    { label: 'Trust Score', value: `${t.trust_score.toFixed(1)}`, icon: Shield, tone: 'text-emerald-400', bar: t.trust_score },
    { label: 'Seller Tier', value: t.tier.toUpperCase(), icon: Award, tone: tierColors[t.tier] || 'text-white', bar: null },
    { label: 'Success Rate', value: `${successRate}%`, icon: TrendingUp, tone: 'text-cyan-400', bar: Number(successRate) },
    { label: 'Satisfaction', value: `${t.buyer_satisfaction_avg.toFixed(1)}/5`, icon: Star, tone: 'text-amber-400', bar: (t.buyer_satisfaction_avg / 5) * 100 },
    { label: 'Total Sales', value: t.total_transactions, icon: ShoppingCart, tone: 'text-blue-400', bar: null },
    { label: 'Escrow Rate', value: `${t.escrow_completion_rate.toFixed(1)}%`, icon: DollarSign, tone: 'text-green-400', bar: t.escrow_completion_rate },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-blue-400" />Seller Analytics
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Trust profile, reputation metrics, and performance analytics.</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <Card key={m.label} className="glass border-white/10 hover-glow transition-all duration-300">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{m.label}</p>
                <m.icon className={`w-4 h-4 ${m.tone}`} />
              </div>
              <p className={`text-2xl font-black ${m.tone}`}>{m.value}</p>
              {m.bar !== null && (
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-1000" style={{ width: `${Math.min(m.bar, 100)}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Badges */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />Reputation Badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {t.badges.length > 0 ? t.badges.map((b) => (
              <Badge key={b.badge_type} variant="outline" className="border-blue-500/30 text-blue-300 px-4 py-1.5 rounded-full font-bold capitalize">
                {b.badge_type.replace(/_/g, ' ')}
              </Badge>
            )) : (
              <p className="text-sm text-muted-foreground">Complete more successful transactions to earn badges.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Breakdown */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black text-sm">Trust Score Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Transaction Success', value: Number(successRate), weight: '20%' },
            { label: 'Buyer Satisfaction', value: (t.buyer_satisfaction_avg / 5) * 100, weight: '20%' },
            { label: 'Escrow Completion', value: t.escrow_completion_rate, weight: '15%' },
            { label: 'Dispute Penalty', value: Math.max(0, 100 - t.dispute_frequency * 10), weight: '-10%' },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-bold w-40 shrink-0">{f.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-blue-500/80 to-emerald-500/80 transition-all duration-1000" style={{ width: `${Math.min(f.value, 100)}%` }} />
              </div>
              <span className="text-xs font-mono text-white w-12 text-right">{f.value.toFixed(0)}%</span>
              <span className="text-[10px] text-muted-foreground font-mono w-10 text-right">{f.weight}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
