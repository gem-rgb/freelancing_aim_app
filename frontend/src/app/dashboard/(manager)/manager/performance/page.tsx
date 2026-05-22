'use client';

import { useEffect, useState } from 'react';
import { LineChart, TrendingUp, Target, Zap, Shield, Clock, Award, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface ProfileData {
  username: string;
  composite_rank_score: number;
  trust_score: number;
  qualification_score: number;
  verification_accuracy: number;
  scam_detection_accuracy: number;
  total_tasks_completed: number;
  total_tasks_assigned: number;
  active_assignments: number;
  specializations: string[];
}

export default function ManagerPerformancePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiService.getManagerProfile();
        setProfile(res.data);
      } catch {
        setProfile({
          username: 'mgr_demo',
          composite_rank_score: 72.45,
          trust_score: 85,
          qualification_score: 78,
          verification_accuracy: 94.2,
          scam_detection_accuracy: 88.5,
          total_tasks_completed: 47,
          total_tasks_assigned: 52,
          active_assignments: 3,
          specializations: ['DeFi', 'Social Engineering', 'Proxy Networks'],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading || !profile) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 rounded-2xl bg-white/5" />)}
        </div>
      </div>
    );
  }

  const completionRate = profile.total_tasks_assigned > 0
    ? ((profile.total_tasks_completed / profile.total_tasks_assigned) * 100).toFixed(1) : '0.0';

  const metrics = [
    { label: 'Composite Rank', value: profile.composite_rank_score.toFixed(1), icon: Target, tone: 'text-violet-300', bar: profile.composite_rank_score },
    { label: 'Trust Score', value: `${profile.trust_score.toFixed(0)}%`, icon: Shield, tone: 'text-emerald-400', bar: profile.trust_score },
    { label: 'Verification Accuracy', value: `${profile.verification_accuracy.toFixed(1)}%`, icon: Zap, tone: 'text-cyan-400', bar: profile.verification_accuracy },
    { label: 'Scam Detection', value: `${profile.scam_detection_accuracy.toFixed(1)}%`, icon: TrendingUp, tone: 'text-blue-400', bar: profile.scam_detection_accuracy },
    { label: 'Qualification Score', value: `${profile.qualification_score.toFixed(0)}%`, icon: Award, tone: 'text-amber-400', bar: profile.qualification_score },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: BarChart3, tone: 'text-blue-400', bar: Number(completionRate) },
    { label: 'Tasks Completed', value: profile.total_tasks_completed, icon: LineChart, tone: 'text-green-400', bar: null },
    { label: 'Active Now', value: profile.active_assignments, icon: Clock, tone: 'text-pink-400', bar: null },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <LineChart className="w-6 h-6 text-violet-400" />Performance Dashboard
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your weighted ranking factors and task performance metrics.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000"
                    style={{ width: `${Math.min(m.bar, 100)}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Specializations */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black text-sm flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />Specializations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {profile.specializations.length > 0 ? (
              profile.specializations.map((s) => (
                <Badge key={s} variant="outline" className="border-violet-500/30 text-violet-300 px-4 py-1.5 rounded-full font-bold">
                  {s}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No specializations assigned yet. Complete more tasks to unlock.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ranking Factors Breakdown */}
      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle className="text-white font-black text-sm flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />Weighted Ranking Factors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Verification Accuracy', weight: '20%', value: profile.verification_accuracy },
            { label: 'Scam Detection', weight: '15%', value: profile.scam_detection_accuracy },
            { label: 'Qualification Score', weight: '15%', value: profile.qualification_score },
            { label: 'Trust Score', weight: '10%', value: profile.trust_score },
            { label: 'Task Consistency', weight: '10%', value: Number(completionRate) },
            { label: 'Experience', weight: '10%', value: Math.min(profile.total_tasks_completed * 2, 100) },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground font-bold w-44 shrink-0">{f.label}</span>
              <div className="flex-1 h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-violet-500/80 to-cyan-500/80 transition-all duration-1000"
                  style={{ width: `${Math.min(f.value, 100)}%` }} />
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
