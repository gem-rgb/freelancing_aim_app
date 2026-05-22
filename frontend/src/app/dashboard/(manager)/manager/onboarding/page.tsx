'use client';

import { useEffect, useState } from 'react';
import {
  UserCheck, Upload, FileText, Brain, MessageSquare,
  CheckCircle2, Clock, ArrowRight, Shield, Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import apiService from '@/utils/api';

interface Application {
  id: string;
  status: string;
  overall_score: number;
  qualification_score: number;
  kyc_verified: boolean;
  created_at: string;
}

interface InterviewSummary {
  id: string;
  status: string;
  total_questions: number;
  answered_questions: number;
  overall_interview_score: number;
  cheat_risk_score: number;
}

const PIPELINE_STEPS = [
  { key: 'submitted', label: 'Application', icon: FileText, desc: 'Submit your credentials' },
  { key: 'resume_parsing', label: 'Resume Analysis', icon: Brain, desc: 'AI-powered skill extraction' },
  { key: 'qualification_review', label: 'Qualification', icon: Shield, desc: 'Match scoring & review' },
  { key: 'interview_scheduled', label: 'Interview', icon: MessageSquare, desc: 'AI-generated questions' },
  { key: 'approved', label: 'Approved', icon: CheckCircle2, desc: 'Welcome to the team' },
];

const statusLabels: Record<string, { text: string; color: string }> = {
  submitted: { text: 'Submitted', color: 'text-blue-400' },
  resume_parsing: { text: 'Parsing Resume', color: 'text-cyan-400' },
  qualification_review: { text: 'Under Review', color: 'text-amber-400' },
  interview_scheduled: { text: 'Interview Ready', color: 'text-violet-400' },
  interview_in_progress: { text: 'In Progress', color: 'text-violet-400' },
  interview_completed: { text: 'Evaluating', color: 'text-cyan-400' },
  under_review: { text: 'Final Review', color: 'text-amber-400' },
  approved: { text: 'Approved', color: 'text-emerald-400' },
  rejected: { text: 'Rejected', color: 'text-red-400' },
  waitlisted: { text: 'Waitlisted', color: 'text-blue-400' },
};

export default function ManagerOnboardingPage() {
  const [application, setApplication] = useState<Application | null>(null);
  const [interviews, setInterviews] = useState<InterviewSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasApplied, setHasApplied] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [appsRes, intRes] = await Promise.allSettled([
          apiService.getMyApplications(),
          apiService.getMyInterviews(),
        ]);
        if (appsRes.status === 'fulfilled') {
          const apps = appsRes.value.data?.results ?? appsRes.value.data ?? [];
          if (apps.length > 0) {
            setApplication(apps[0]);
            setHasApplied(true);
          }
        }
        if (intRes.status === 'fulfilled') {
          setInterviews(intRes.value.data?.results ?? intRes.value.data ?? []);
        }
      } catch { /* graceful fallback */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const currentStepIndex = application
    ? PIPELINE_STEPS.findIndex((s) => s.key === application.status || application.status.startsWith(s.key))
    : -1;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 rounded-2xl bg-white/5 border border-white/5" />
        <div className="h-64 rounded-2xl bg-white/5 border border-white/5" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <UserCheck className="w-6 h-6 text-violet-400" />Manager Onboarding
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-assisted recruitment pipeline — resume analysis, qualification matching, and interview evaluation.
        </p>
      </div>

      {/* Pipeline Progress */}
      <Card className="glass border-white/10 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Recruitment Pipeline</p>
            {application && (
              <Badge variant="outline" className={`${statusLabels[application.status]?.color || 'text-muted-foreground'} border-white/10 font-mono text-xs`}>
                {statusLabels[application.status]?.text || application.status}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-0">
            {PIPELINE_STEPS.map((step, i) => {
              const isComplete = currentStepIndex > i;
              const isCurrent = currentStepIndex === i;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-center flex-1 min-w-0">
                  <div className="flex flex-col items-center min-w-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 ${
                      isComplete ? 'bg-emerald-500/20 text-emerald-400' :
                      isCurrent ? 'bg-violet-500/20 text-violet-400 ring-2 ring-violet-500/30' :
                      'bg-white/5 text-muted-foreground'
                    }`}>
                      {isComplete ? <CheckCircle2 className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                    </div>
                    <p className={`text-[10px] font-black uppercase tracking-wider mt-2 text-center ${
                      isCurrent ? 'text-violet-300' : isComplete ? 'text-emerald-400' : 'text-muted-foreground'
                    }`}>{step.label}</p>
                    <p className="text-[9px] text-muted-foreground text-center mt-0.5 hidden sm:block">{step.desc}</p>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-2 transition-all duration-500 ${
                      isComplete ? 'bg-emerald-500/40' : 'bg-white/10'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* No Application Yet */}
      {!hasApplied && (
        <Card className="glass border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
              <Upload className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-xl font-black text-white mb-2">Apply to Become a Manager</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Upload your resume and cover letter. Our AI will analyze your qualifications and match you to verification specializations.
            </p>
            <Button className="bg-violet-600 hover:bg-violet-700 font-black rounded-full px-8">
              <Upload className="w-4 h-4 mr-2" />Start Application
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Application Details */}
      {application && (
        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black text-sm flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />Qualification Scores
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: 'Overall Score', value: application.overall_score },
                { label: 'Qualification Match', value: application.qualification_score },
              ].map((m) => (
                <div key={m.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground font-bold">{m.label}</span>
                    <span className="text-white font-mono">{m.value.toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-1000" style={{ width: `${Math.min(m.value, 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2">
                <span className="text-[10px] text-muted-foreground font-bold">KYC Status:</span>
                <Badge variant="outline" className={application.kyc_verified ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}>
                  {application.kyc_verified ? 'Verified' : 'Pending'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card className="glass border-white/10">
            <CardHeader>
              <CardTitle className="text-white font-black text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-violet-400" />Interview Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm font-bold">No interviews yet</p>
                  <p className="text-xs">Interviews are scheduled after qualification review.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {interviews.map((int) => (
                    <div key={int.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                      <div>
                        <p className="text-sm text-white font-bold">{int.answered_questions}/{int.total_questions} answered</p>
                        <p className="text-[10px] text-muted-foreground font-mono">Score: {int.overall_interview_score.toFixed(1)}%</p>
                      </div>
                      <Badge variant="outline" className={`text-xs ${statusLabels[int.status]?.color || 'text-muted-foreground'}`}>
                        {int.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
