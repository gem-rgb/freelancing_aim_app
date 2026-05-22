'use client';

import { Shield, AlertTriangle, CheckCircle2, Scale, FileWarning, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function TrustPolicyPage() {
  const policies = [
    {
      title: 'Chunk Isolation Protocol',
      status: 'active',
      description: 'No single manager receives all chunks from a listing. Tasks are distributed across independent reviewers with randomized batch labels.',
      icon: Shield,
      color: 'text-emerald-400',
    },
    {
      title: 'Consensus Threshold',
      status: 'active',
      description: 'A minimum of 3 independent reviews are required before consensus is determined. Split verdicts trigger automatic escalation.',
      icon: Scale,
      color: 'text-blue-400',
    },
    {
      title: 'Fraud Signal Escalation',
      status: 'active',
      description: 'Any fraud_signal decision from a chunk review immediately escalates the entire listing for admin investigation.',
      icon: AlertTriangle,
      color: 'text-red-400',
    },
    {
      title: 'Anti-Collusion Randomization',
      status: 'active',
      description: 'Assignment weights include a randomization factor (default 15%) to prevent predictable task routing and reduce collusion risk.',
      icon: Users,
      color: 'text-violet-400',
    },
    {
      title: 'Cheat Detection Layer',
      status: 'active',
      description: 'Interview answers are analyzed for AI generation probability, typing speed anomalies, and stylometric consistency across responses.',
      icon: FileWarning,
      color: 'text-amber-400',
    },
    {
      title: 'Stake-Based Accountability',
      status: 'active',
      description: '40% of seller earnings are staked in escrow until verification completes. Failed verification or confirmed fraud results in stake slashing.',
      icon: CheckCircle2,
      color: 'text-cyan-400',
    },
  ];

  const trustMetrics = [
    { label: 'Active Policies', value: policies.length, color: 'text-emerald-400' },
    { label: 'Consensus Required', value: '3+', color: 'text-blue-400' },
    { label: 'Randomization Factor', value: '15%', color: 'text-violet-400' },
    { label: 'Stake Rate', value: '40%', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-400" />Trust &amp; Policy
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Platform integrity policies governing verification, consensus, and accountability.
        </p>
      </div>

      {/* Quick metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {trustMetrics.map((m) => (
          <Card key={m.label} className="glass border-white/10">
            <CardContent className="p-5 text-center">
              <p className={`text-3xl font-black ${m.color}`}>{m.value}</p>
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mt-1">{m.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Policy Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {policies.map((policy) => (
          <Card key={policy.title} className="glass border-white/10 hover-glow transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${policy.color}`}>
                    <policy.icon className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-white font-black text-sm">{policy.title}</CardTitle>
                </div>
                <Badge variant="outline" className="text-emerald-400 border-emerald-500/30 text-[9px]">
                  {policy.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm leading-relaxed">{policy.description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
