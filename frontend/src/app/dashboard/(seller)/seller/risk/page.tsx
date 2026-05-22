'use client';

import { useEffect, useState } from 'react';
import { Radar, AlertTriangle, Shield, Eye, FileWarning, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface FraudStats {
  open_alerts: number;
  pending_reports: number;
  confirmed_fraud: number;
}

interface AlertItem {
  id: string;
  flagged_listing_title: string;
  severity: string;
  status: string;
  description: string;
  created_at: string;
}

const severityConfig: Record<string, { color: string; bg: string }> = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10' },
  high: { color: 'text-blue-400', bg: 'bg-blue-500/10' },
  medium: { color: 'text-amber-400', bg: 'bg-amber-500/10' },
  low: { color: 'text-slate-400', bg: 'bg-slate-500/10' },
};

export default function SellerRiskPage() {
  const [fraudStats, setFraudStats] = useState<FraudStats | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, alertsRes] = await Promise.allSettled([
          apiService.getFraudStats(),
          apiService.getReuploadAlerts(),
        ]);
        if (statsRes.status === 'fulfilled') setFraudStats(statsRes.value.data);
        if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.data?.results ?? alertsRes.value.data ?? []);
      } catch { /* demo fallback */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const fs = fraudStats ?? { open_alerts: 0, pending_reports: 0, confirmed_fraud: 0 };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid sm:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Radar className="w-6 h-6 text-blue-400" />Risk Monitor
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Fraud detection alerts, reupload monitoring, and product integrity status.</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { label: 'Open Alerts', value: fs.open_alerts, icon: AlertTriangle, tone: fs.open_alerts > 0 ? 'text-red-400' : 'text-emerald-400', bg: fs.open_alerts > 0 ? 'from-red-500/10' : 'from-emerald-500/10' },
          { label: 'Pending Reports', value: fs.pending_reports, icon: FileWarning, tone: 'text-amber-400', bg: 'from-amber-500/10' },
          { label: 'Confirmed Fraud', value: fs.confirmed_fraud, icon: Shield, tone: fs.confirmed_fraud > 0 ? 'text-red-400' : 'text-emerald-400', bg: fs.confirmed_fraud > 0 ? 'from-red-500/10' : 'from-emerald-500/10' },
        ].map((m) => (
          <Card key={m.label} className={`glass border-white/10 bg-gradient-to-br ${m.bg} to-transparent`}>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{m.label}</p>
                <p className={`text-3xl font-black mt-2 ${m.tone}`}>{m.value}</p>
              </div>
              <m.icon className={`w-5 h-5 ${m.tone}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status indicator */}
      {fs.open_alerts === 0 && fs.confirmed_fraud === 0 ? (
        <Card className="glass border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500/50" />
            <h3 className="text-xl font-black text-white mb-2">All Clear</h3>
            <p className="text-muted-foreground">No active fraud alerts or reupload detections on your listings.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass border-white/10">
          <CardHeader>
            <CardTitle className="text-white font-black text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />Active Alerts
            </CardTitle>
            <CardDescription>Reupload and fraud detection alerts for your listings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No alerts to display.</p>
            ) : (
              alerts.map((alert) => {
                const cfg = severityConfig[alert.severity] || severityConfig.medium;
                return (
                  <div key={alert.id} className="flex items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <AlertTriangle className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white font-bold">{alert.flagged_listing_title}</span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${cfg.color} border-white/10`}>{alert.severity}</Badge>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-muted-foreground border-white/10">{alert.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">{new Date(alert.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* Ownership Lineage Tree */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />Ownership Lineage Tracking
          </CardTitle>
          <CardDescription>Track the chain of custody for your verified digital products.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300/10 before:to-transparent">
            {/* Mock lineage nodes */}
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-cyan-500 bg-cyan-500/20 text-cyan-400 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">Original Mint</span>
                  <span className="text-xs font-mono text-cyan-400">Current</span>
                </div>
                <p className="text-xs text-muted-foreground">Product Hash: 0x8f...4a21</p>
                <p className="text-xs text-muted-foreground">Owner: <span className="text-white font-medium">You</span></p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-white/10 bg-white/[0.01] opacity-50 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-300 text-sm">Transfer Blocked</span>
                  <span className="text-xs font-mono text-red-400">Flagged</span>
                </div>
                <p className="text-xs text-muted-foreground">Attempted duplicate upload detected.</p>
                <p className="text-xs text-muted-foreground">Actor: <span className="text-slate-300">User_0x99</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Anti-Reupload Info */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black text-sm flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />Product Integrity System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-cyan-400 shrink-0">1</span>
            <p><strong className="text-white">Content Fingerprinting</strong> — Every upload generates a SHA-256 hash and semantic embedding for duplicate detection.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-cyan-400 shrink-0">2</span>
            <p><strong className="text-white">Ownership Lineage</strong> — Complete chain of custody from original upload through every purchase and transfer.</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs text-cyan-400 shrink-0">3</span>
            <p><strong className="text-white">Automated Alerts</strong> — Reupload attempts trigger severity-rated alerts and can result in stake slashing.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
