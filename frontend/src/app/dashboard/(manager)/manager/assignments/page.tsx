'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Clock, CheckCircle2, AlertTriangle, Zap, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface TaskItem {
  id: string;
  listing_title: string;
  chunk_index: number;
  total_chunks: number;
  randomized_batch_label: string;
  status: string;
  priority: string;
  decision: string;
  review_score: number;
  due_at: string | null;
  assigned_at: string | null;
  completed_at: string | null;
}

const statusColors: Record<string, string> = {
  assigned: 'text-blue-400',
  in_progress: 'text-violet-400',
  completed: 'text-emerald-400',
  escalated: 'text-red-400',
  expired: 'text-slate-400',
};

export default function AssignmentsPage() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiService.getAssignedTasks();
        setTasks(res.data?.results ?? res.data ?? []);
      } catch {
        setTasks([
          { id: 'a1', listing_title: 'DeFi Yield Method', chunk_index: 2, total_chunks: 5, randomized_batch_label: 'BATCH-Ω-7741', status: 'completed', priority: 'high', decision: 'clean', review_score: 92, due_at: null, assigned_at: new Date(Date.now() - 172800000).toISOString(), completed_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 'a2', listing_title: 'Social Engineering Kit', chunk_index: 0, total_chunks: 3, randomized_batch_label: 'BATCH-Δ-3928', status: 'in_progress', priority: 'urgent', decision: '', review_score: 0, due_at: new Date(Date.now() + 43200000).toISOString(), assigned_at: new Date(Date.now() - 7200000).toISOString(), completed_at: null },
          { id: 'a3', listing_title: 'Proxy Chain Config', chunk_index: 4, total_chunks: 6, randomized_batch_label: 'BATCH-Σ-1105', status: 'assigned', priority: 'medium', decision: '', review_score: 0, due_at: new Date(Date.now() + 172800000).toISOString(), assigned_at: new Date(Date.now() - 3600000).toISOString(), completed_at: null },
        ]);
      } finally { setLoading(false); }
    }
    load();
  }, []);

  const active = tasks.filter((t) => ['assigned', 'in_progress'].includes(t.status));
  const completed = tasks.filter((t) => t.status === 'completed');
  const other = tasks.filter((t) => !['assigned', 'in_progress', 'completed'].includes(t.status));

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  const renderTask = (task: TaskItem) => (
    <Card key={task.id} className="glass border-white/10 hover:border-violet-500/20 transition-all">
      <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className={`w-2 h-2 rounded-full ${task.status === 'completed' ? 'bg-emerald-500' : task.status === 'in_progress' ? 'bg-violet-500 animate-pulse' : 'bg-blue-500'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono text-violet-300">{task.randomized_batch_label}</span>
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${statusColors[task.status] || 'text-muted-foreground'} border-white/10`}>{task.status}</Badge>
              {task.decision && <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-emerald-400 border-emerald-500/20">{task.decision}</Badge>}
            </div>
            <p className="text-sm text-white font-bold truncate mt-0.5">{task.listing_title}</p>
            <p className="text-[10px] text-muted-foreground font-mono">Chunk #{task.chunk_index + 1}/{task.total_chunks}{task.review_score > 0 && ` • Score: ${task.review_score}`}</p>
          </div>
        </div>
        {task.status !== 'completed' ? (
          <Button size="sm" className="bg-violet-600 hover:bg-violet-700 font-bold rounded-full shrink-0" asChild>
            <Link href={`/dashboard/manager/chunks/${encodeURIComponent(task.id)}`}>Review</Link>
          </Button>
        ) : (
          <CheckCircle2 className="w-5 h-5 text-emerald-500/50 shrink-0" />
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Layers className="w-6 h-6 text-violet-400" />All Assignments
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your complete task history — active and completed reviews.</p>
      </div>

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-amber-400">Active ({active.length})</h2>
          {active.map(renderTask)}
        </div>
      )}

      {completed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Completed ({completed.length})</h2>
          {completed.map(renderTask)}
        </div>
      )}

      {other.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Other ({other.length})</h2>
          {other.map(renderTask)}
        </div>
      )}

      {tasks.length === 0 && (
        <Card className="glass border-white/10">
          <CardContent className="py-16 text-center">
            <Layers className="w-16 h-16 mx-auto mb-4 text-violet-500/20" />
            <p className="text-white font-bold text-lg">No assignments yet</p>
            <p className="text-sm text-muted-foreground">Tasks will appear here when you are assigned to verification chunks.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
