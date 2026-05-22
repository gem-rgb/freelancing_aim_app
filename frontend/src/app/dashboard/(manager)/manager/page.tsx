'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ListChecks, Layers, Shield, TrendingUp, Clock,
  Activity, CheckCircle2, AlertTriangle, Target, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface ManagerStats {
  composite_rank: number;
  trust_score: number;
  total_completed: number;
  active_assignments: number;
  pending_tasks: number;
  in_progress_tasks: number;
  completed_tasks: number;
  verification_accuracy: number;
}

interface TaskItem {
  id: string;
  listing_title: string;
  chunk_index: number;
  total_chunks: number;
  randomized_batch_label: string;
  status: string;
  priority: string;
  due_at: string | null;
  assigned_at: string | null;
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  assigned: Clock,
  in_progress: Activity,
  completed: CheckCircle2,
  escalated: AlertTriangle,
};

export default function ManagerHomePage() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, tasksRes] = await Promise.allSettled([
          apiService.getManagerDashboardStats(),
          apiService.getAssignedTasks(),
        ]);
        if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
        if (tasksRes.status === 'fulfilled') setTasks(tasksRes.value.data?.results ?? tasksRes.value.data ?? []);
      } catch {
        // Graceful fallback — use demo data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const s = stats ?? {
    composite_rank: 72.45,
    trust_score: 85.0,
    total_completed: 47,
    active_assignments: 3,
    pending_tasks: 2,
    in_progress_tasks: 1,
    completed_tasks: 47,
    verification_accuracy: 94.2,
  };

  const activeTasks = tasks.length > 0 ? tasks.filter((t) => t.status !== 'completed') : [
    { id: 'demo_1', listing_title: 'DeFi Yield Method', chunk_index: 2, total_chunks: 5, randomized_batch_label: 'BATCH-Ω-7741', status: 'assigned', priority: 'high', due_at: new Date(Date.now() + 86400000).toISOString(), assigned_at: new Date().toISOString() },
    { id: 'demo_2', listing_title: 'Social Engineering Kit', chunk_index: 0, total_chunks: 3, randomized_batch_label: 'BATCH-Δ-3928', status: 'in_progress', priority: 'urgent', due_at: new Date(Date.now() + 43200000).toISOString(), assigned_at: new Date(Date.now() - 7200000).toISOString() },
    { id: 'demo_3', listing_title: 'Proxy Chain Config', chunk_index: 4, total_chunks: 6, randomized_batch_label: 'BATCH-Σ-1105', status: 'assigned', priority: 'medium', due_at: new Date(Date.now() + 172800000).toISOString(), assigned_at: new Date(Date.now() - 3600000).toISOString() },
  ];

  const metricCards = [
    { label: 'Rank Score', value: s.composite_rank.toFixed(1), icon: Target, tone: 'text-violet-300', bg: 'from-violet-500/10 to-violet-600/5' },
    { label: 'Trust Score', value: `${s.trust_score.toFixed(0)}%`, icon: Shield, tone: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-600/5' },
    { label: 'Accuracy', value: `${s.verification_accuracy.toFixed(1)}%`, icon: Zap, tone: 'text-cyan-400', bg: 'from-cyan-500/10 to-cyan-600/5' },
    { label: 'Active Tasks', value: s.active_assignments, icon: Layers, tone: 'text-blue-400', bg: 'from-blue-500/10 to-blue-600/5' },
    { label: 'Completed', value: s.total_completed, icon: CheckCircle2, tone: 'text-green-400', bg: 'from-green-500/10 to-green-600/5' },
    { label: 'Pending', value: s.pending_tasks, icon: Clock, tone: 'text-amber-400', bg: 'from-amber-500/10 to-amber-600/5' },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 border border-white/5" />
          ))}
        </div>
        <div className="h-96 rounded-2xl bg-white/5 border border-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Performance Metrics ── */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {metricCards.map((c) => (
          <Card key={c.label} className={`glass border-white/10 bg-gradient-to-br ${c.bg} hover-glow transition-all duration-300`}>
            <CardContent className="p-5 flex items-start justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{c.label}</p>
                <p className={`text-3xl font-black mt-2 ${c.tone}`}>{c.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center ${c.tone}`}>
                <c.icon className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Quick Actions Bar ── */}
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="border-violet-500/40 text-violet-200 font-bold rounded-full" asChild>
          <Link href="/dashboard/manager/verification-queue"><ListChecks className="w-4 h-4 mr-2" />Verification Queue</Link>
        </Button>
        <Button variant="outline" className="border-cyan-500/30 text-cyan-300 font-bold rounded-full" asChild>
          <Link href="/dashboard/manager/assignments"><Layers className="w-4 h-4 mr-2" />All Assignments</Link>
        </Button>
        <Button variant="outline" className="border-emerald-500/30 text-emerald-300 font-bold rounded-full" asChild>
          <Link href="/dashboard/manager/performance"><TrendingUp className="w-4 h-4 mr-2" />Performance</Link>
        </Button>
      </div>

      {/* ── Active Chunk Tasks ── */}
      <Card className="glass border-white/10">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-white font-black flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Active Chunk Assignments
            </CardTitle>
            <CardDescription>Randomized chunk labels — no manager sees the full ciphertext set.</CardDescription>
          </div>
          <Badge variant="outline" className="border-violet-500/30 text-violet-300 font-mono text-xs">
            {activeTasks.length} active
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/50" />
              <p className="font-bold">All caught up!</p>
              <p className="text-sm">No pending chunk assignments.</p>
            </div>
          ) : (
            activeTasks.map((task) => {
              const StatusIcon = statusIcons[task.status] || Clock;
              const timeLeft = task.due_at ? Math.max(0, Math.round((new Date(task.due_at).getTime() - Date.now()) / 3600000)) : null;
              return (
                <div key={task.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition-all duration-200">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <StatusIcon className="w-5 h-5 text-violet-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-mono text-violet-300 tracking-wider">{task.randomized_batch_label}</p>
                      <p className="text-sm text-white font-bold truncate">{task.listing_title ?? 'Classified Listing'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                          Chunk #{task.chunk_index + 1}/{task.total_chunks}
                        </span>
                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityColors[task.priority] || priorityColors.medium}`}>
                          {task.priority}
                        </Badge>
                        {timeLeft !== null && (
                          <span className={`text-[10px] font-mono ${timeLeft < 12 ? 'text-red-400' : 'text-muted-foreground'}`}>
                            {timeLeft}h left
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 font-bold rounded-full shrink-0" asChild>
                    <Link href={`/dashboard/manager/chunks/${encodeURIComponent(task.id)}`}>Review</Link>
                  </Button>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── Trust & Policy Summary ── */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="glass border-white/10 bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-white font-black text-sm flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />Trust Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'Verification Accuracy', value: `${s.verification_accuracy.toFixed(1)}%`, bar: s.verification_accuracy },
              { label: 'Trust Score', value: `${s.trust_score.toFixed(0)}%`, bar: s.trust_score },
              { label: 'Composite Rank', value: s.composite_rank.toFixed(1), bar: s.composite_rank },
            ].map((m) => (
              <div key={m.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground font-bold">{m.label}</span>
                  <span className="text-white font-mono">{m.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000" style={{ width: `${Math.min(m.bar, 100)}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass border-white/10 bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-white font-black text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-violet-400" />Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { text: 'Completed chunk review BATCH-Ω-7741', time: '2h ago', icon: '✓' },
                { text: 'Escalated suspicious content in BATCH-Δ-3928', time: '5h ago', icon: '⚠' },
                { text: 'New assignment: BATCH-Σ-1105', time: '8h ago', icon: '→' },
                { text: 'Trust score recalculated: +2.3', time: '1d ago', icon: '↑' },
              ].map((a, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-xs shrink-0 mt-0.5">{a.icon}</span>
                  <div className="min-w-0">
                    <p className="text-white/80 truncate">{a.text}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
