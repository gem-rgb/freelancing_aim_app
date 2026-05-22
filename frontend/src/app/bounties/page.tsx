'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Target, 
  PlusCircle, 
  Clock, 
  MessageSquare, 
  TrendingUp, 
  AlertCircle, 
  Zap, 
  Trophy,
  ArrowRight,
  Filter,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Bounty {
  id: string; title: string; description: string; reward: number;
  buyer_username: string; buyer_reputation: number; status: string;
  priority: string; category: string; tags_list: string[];
  submission_count: number; view_count: number; deadline: string | null; created_at: string;
}

const PRIORITY_CONFIG: Record<string, { color: string; bg: string; icon: any }> = {
  urgent: { color: 'text-red-500', bg: 'bg-red-500/10', icon: Zap },
  high:   { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: TrendingUp },
  medium: { color: 'text-blue-500', bg: 'bg-blue-500/10', icon: Target },
  low:    { color: 'text-slate-500', bg: 'bg-slate-500/10', icon: Clock },
};

function BountyCard({ bounty }: { bounty: Bounty }) {
  const config = PRIORITY_CONFIG[bounty.priority] || PRIORITY_CONFIG.low;
  const PriorityIcon = config.icon;

  return (
    <Link href={`/bounties/${bounty.id}`}>
      <Card className="glass border-white/5 overflow-hidden group hover:border-blue-500/20 transition-all hover-glow h-full flex flex-col">
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest border-transparent", config.bg, config.color)}>
              <PriorityIcon className="w-3 h-3 mr-1.5" />
              {bounty.priority} Priority
            </Badge>
            <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">{bounty.submission_count} Solutions</span>
          </div>

          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-blue-400 transition-colors">
              {bounty.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {bounty.description}
            </p>
            
            <div className="flex flex-wrap gap-1.5 py-2">
                {bounty.tags_list.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[9px] font-bold text-muted-foreground/60 uppercase">#{tag}</span>
                ))}
            </div>
          </div>

          {bounty.deadline && (
            <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-blue-500/60 uppercase tracking-widest">
                <Calendar className="w-3 h-3" />
                Ends: {new Date(bounty.deadline).toLocaleDateString()}
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div>
                <p className="text-xl font-black text-white tracking-tighter">₦{Number(bounty.reward).toLocaleString()}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase mt-1">Requested by @{bounty.buyer_username}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all">
                <ArrowRight className="w-5 h-5 text-blue-500 group-hover:text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BountiesPage() {
  const { isAuthenticated } = useAuth();
  const [bounties, setBounties]     = useState<Bounty[]>([]);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState('open');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requirements: '', reward: '', category: '', tags: '', priority: 'medium', deadline: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiService.getBounties({ status }).then(r => { setBounties(r.data.results || r.data); }).finally(() => setLoading(false));
  }, [status]);

  const createBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.createBounty({ ...form, reward: parseFloat(form.reward) } as any);
      setShowCreate(false);
      setStatus('open');
      const r = await apiService.getBounties({ status: 'open' });
      setBounties(r.data.results || r.data);
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const STATUS_TABS = [
    { key: 'open',        label: 'Active Bounties' },
    { key: 'in_progress', label: 'In Verification'  },
    { key: 'completed',   label: 'Fulfilled'    },
  ];

  return (
    <main className="min-h-screen pb-24 pt-32">
      {/* Header */}
      <section className="bg-white/5 border-b border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight">
              Bounty <span className="text-blue-500">Board</span>
            </h1>
            <p className="text-muted-foreground font-medium max-w-md">
              Broadcast your intelligence requirements to the network. Guaranteed escrow payout upon verified delivery.
            </p>
          </div>
          {isAuthenticated && (
            <Button size="lg" className="h-14 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20" onClick={() => setShowCreate(true)}>
              <PlusCircle className="w-5 h-5 mr-3" /> Post New Bounty
            </Button>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Filter Tabs */}
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit">
          {STATUS_TABS.map((t) => (
            <Button
              key={t.key}
              variant="ghost"
              size="sm"
              onClick={() => setStatus(t.key)}
              className={cn(
                "rounded-xl px-6 py-5 font-bold uppercase text-[10px] tracking-widest transition-all",
                status === t.key ? "bg-white/10 text-white shadow-xl" : "text-muted-foreground hover:text-white"
              )}
            >
              {t.label}
            </Button>
          ))}
        </div>

        {/* Bounties Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[280px] bg-white/5 border border-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : bounties.length === 0 ? (
          <div className="text-center py-32 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto border border-white/5">
                <Trophy className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
                <p className="text-white font-black uppercase tracking-tight text-xl">The Board is Empty</p>
                <p className="text-muted-foreground text-sm">Post a bounty to crowdsource the intelligence you need.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-700 slide-in-from-bottom-4">
            {bounties.map(b => <BountyCard key={b.id} bounty={b} />)}
          </div>
        )}
      </div>

      {/* Create Bounty Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="glass border-white/10 sm:max-w-[500px] p-0 overflow-hidden">
          <form onSubmit={createBounty}>
            <div className="p-8 space-y-6">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <PlusCircle className="w-6 h-6 text-blue-500" />
                    Post Bounty
                </DialogTitle>
                <DialogDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                    Define your intelligence requirements
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bounty Objective</label>
                    <Input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Verified Nigerian E-commerce traffic strategy" className="h-12 bg-white/5 border-white/10 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Full Description</label>
                    <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Describe the specific problem or strategy you need..." className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-medium focus:outline-none focus:border-blue-500/50 resize-none transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reward (₦)</label>
                        <Input required type="number" min="100" value={form.reward} onChange={e => setForm(p => ({ ...p, reward: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl font-black text-lg" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Priority</label>
                        <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold appearance-none focus:outline-none focus:border-blue-500/50">
                            <option value="low" className="bg-slate-900">Low</option>
                            <option value="medium" className="bg-slate-900">Medium</option>
                            <option value="high" className="bg-slate-900">High</option>
                            <option value="urgent" className="bg-slate-900">Urgent</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deadline (Optional)</label>
                    <Input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} className="h-12 bg-white/5 border-white/10 rounded-xl text-white" />
                </div>
              </div>

              <DialogFooter className="pt-4 gap-3">
                <Button variant="ghost" className="rounded-xl font-bold" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="h-12 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20">
                    {submitting ? "Broadcasting..." : "Broadcast Bounty"}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
