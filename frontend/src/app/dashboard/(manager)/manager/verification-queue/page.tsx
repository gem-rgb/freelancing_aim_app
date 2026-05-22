'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ListChecks, Clock, AlertTriangle, CheckCircle2, Filter,
  ChevronRight, Layers, Zap,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface QueueTask {
  id: string;
  listing: string;
  listing_title: string;
  chunk_index: number;
  total_chunks: number;
  randomized_batch_label: string;
  status: string;
  priority: string;
  assigned_manager_username: string | null;
  due_at: string | null;
  created_at: string;
}

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { color: 'text-amber-400', icon: Clock, label: 'Pending' },
  assigned: { color: 'text-blue-400', icon: Layers, label: 'Assigned' },
  in_progress: { color: 'text-violet-400', icon: Zap, label: 'In Progress' },
  completed: { color: 'text-emerald-400', icon: CheckCircle2, label: 'Completed' },
  escalated: { color: 'text-red-400', icon: AlertTriangle, label: 'Escalated' },
};

const priorityBadge: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
  high: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  low: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
};

export default function VerificationQueuePage() {
  const [tasks, setTasks] = useState<QueueTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function load() {
      try {
        const params = filter !== 'all' ? { status: filter } : undefined;
        const res = await apiService.getTaskQueue(params);
        setTasks(res.data?.results ?? res.data ?? []);
      } catch {
        setTasks([
          { id: 'q1', listing: 'lst1', listing_title: 'DeFi Yield Optimization', chunk_index: 0, total_chunks: 4, randomized_batch_label: 'BATCH-Ω-7741', status: 'assigned', priority: 'high', assigned_manager_username: null, due_at: new Date(Date.now() + 86400000).toISOString(), created_at: new Date().toISOString() },
          { id: 'q2', listing: 'lst2', listing_title: 'Social Engineering Playbook', chunk_index: 2, total_chunks: 3, randomized_batch_label: 'BATCH-Δ-3928', status: 'pending', priority: 'urgent', assigned_manager_username: null, due_at: null, created_at: new Date().toISOString() },
          { id: 'q3', listing: 'lst3', listing_title: 'Proxy Chain Configuration', chunk_index: 1, total_chunks: 5, randomized_batch_label: 'BATCH-Σ-1105', status: 'in_progress', priority: 'medium', assigned_manager_username: 'mgr_alpha', due_at: new Date(Date.now() + 172800000).toISOString(), created_at: new Date(Date.now() - 3600000).toISOString() },
          { id: 'q4', listing: 'lst4', listing_title: 'E-commerce Arbitrage Method', chunk_index: 3, total_chunks: 6, randomized_batch_label: 'BATCH-Ψ-5502', status: 'escalated', priority: 'high', assigned_manager_username: 'mgr_beta', due_at: null, created_at: new Date(Date.now() - 7200000).toISOString() },
        ]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  const statusFilters = ['all', 'pending', 'assigned', 'in_progress', 'completed', 'escalated'];
  const filteredTasks = filter === 'all' ? tasks : tasks.filter((t) => t.status === filter);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-2xl bg-white/5 border border-white/5" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <ListChecks className="w-6 h-6 text-violet-400" />
            Verification Queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Review distributed content chunks for listing verification.</p>
        </div>
        <Badge variant="outline" className="border-violet-500/30 text-violet-300 font-mono text-xs w-fit">
          {tasks.length} total tasks
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-white/5 rounded-2xl w-fit">
        {statusFilters.map((s) => (
          <Button key={s} variant="ghost" size="sm" onClick={() => setFilter(s)}
            className={`rounded-xl px-4 py-2 font-bold uppercase text-[10px] tracking-widest transition-all ${filter === s ? 'bg-violet-500/20 text-violet-300' : 'text-muted-foreground hover:text-white'}`}>
            <Filter className="w-3 h-3 mr-1.5" />{s === 'all' ? 'All' : s.replace('_', ' ')}
          </Button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <Card className="glass border-white/10">
            <CardContent className="py-16 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-emerald-500/30" />
              <p className="text-white font-bold text-lg">Queue is clear</p>
              <p className="text-sm text-muted-foreground">No tasks match the current filter.</p>
            </CardContent>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const cfg = statusConfig[task.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            const timeLeft = task.due_at ? Math.max(0, Math.round((new Date(task.due_at).getTime() - Date.now()) / 3600000)) : null;
            return (
              <Card key={task.id} className="glass border-white/10 hover:border-violet-500/20 transition-all group">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center shrink-0 ${cfg.color}`}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono text-violet-300 tracking-wider">{task.randomized_batch_label}</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityBadge[task.priority] || priorityBadge.medium}`}>{task.priority}</Badge>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 border-white/10 ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                        <p className="text-sm text-white font-bold mt-1 truncate">{task.listing_title}</p>
                        <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground font-mono">
                          <span>Chunk #{task.chunk_index + 1}/{task.total_chunks}</span>
                          {task.assigned_manager_username && <span>→ @{task.assigned_manager_username}</span>}
                          {timeLeft !== null && <span className={timeLeft < 12 ? 'text-red-400' : ''}>{timeLeft}h remaining</span>}
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="border-violet-500/30 text-violet-300 font-bold rounded-full shrink-0 group-hover:bg-violet-500/10" asChild>
                      <Link href={`/dashboard/manager/chunks/${encodeURIComponent(task.id)}`}>
                        Review <ChevronRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
