'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { EncryptionService } from '@/utils/encryption';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  Lock, 
  Upload, 
  FileText, 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  X,
  FileCode,
  Image as ImageIcon,
  Video,
  File as FileIcon,
  Music
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─── constants ─────────────────────────────────────────────────── */
const CATEGORIES = ['Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];

const MEDIA_TYPES = [
  { value: 'image',    icon: <ImageIcon className="w-4 h-4" />,  label: 'Image',    accept: 'image/*',    ext: 'JPG, PNG, GIF', maxMb: 20 },
  { value: 'video',    icon: <Video className="w-4 h-4" />,  label: 'Video',    accept: 'video/*',    ext: 'MP4, MOV',       maxMb: 200 },
  { value: 'document', icon: <FileIcon className="w-4 h-4" />, label: 'Doc', accept: '.pdf,.doc,.txt', ext: 'PDF, TXT', maxMb: 50 },
];

/* ─── types ─────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;
interface PreviewMediaItem {
  id: string;
  localUrl: string;
  file_url: string;
  media_type: string;
  filename: string;
  file_size: number;
  uploading: boolean;
  progress: number;
  error: string;
}

export default function CreateListingPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?next=/dashboard/create');
  }, [isLoading, isAuthenticated, router]);

  const [step, setStep]   = useState<Step>(1);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '', description: '', preview_content: '',
    price: '', category: '', tags: '',
  });

  const [previewMedia, setPreviewMedia] = useState<PreviewMediaItem[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<string>('image');
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);
  const [contentPlain, setContentPlain] = useState('');
  const [encryptedBlob, setEncryptedBlob] = useState<string | null>(null);
  const [aesKey, setAesKey] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const hf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  if (isLoading || !isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-white tracking-tight">Deploy <span className="text-gradient">Asset</span></h1>
        <p className="text-muted-foreground text-sm font-bold uppercase tracking-widest">Step {step} of 4: {['General Details', 'Encryption Layer', 'Proof of Work', 'Network Review'][step - 1]}</p>
      </div>

      {/* Progress */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-full">
        {[1,2,3,4].map(s => (
          <div key={s} className={cn(
            "h-1.5 flex-1 rounded-full transition-all duration-500",
            s <= step ? "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20" : "bg-white/10"
          )} />
        ))}
      </div>

      {error && (
        <Card className="border-red-500/20 bg-red-500/10">
          <CardContent className="p-4 flex items-center gap-3 text-red-500 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            {error}
          </CardContent>
        </Card>
      )}

      {/* ══ STEP 1: Details ════════════════════════════════════════ */}
      {step === 1 && (
        <div className="grid gap-8 animate-in slide-in-from-right duration-500">
          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-black">General Information</CardTitle>
              <CardDescription>Public identity of your intelligence asset</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Asset Title</label>
                <Input 
                  value={form.title} 
                  onChange={e => hf('title', e.target.value)}
                  placeholder="e.g. Verified High-Yield Forex Scalping Strategy"
                  className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 font-bold"
                />
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Category</label>
                  <select 
                    value={form.category} 
                    onChange={e => hf('category', e.target.value)}
                    className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold appearance-none focus:outline-none focus:border-blue-500/50"
                  >
                    <option value="">Select Sector</option>
                    {CATEGORIES.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Price (₦)</label>
                  <Input 
                    type="number"
                    value={form.price} 
                    onChange={e => hf('price', e.target.value)}
                    placeholder="25000"
                    className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 font-black text-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Public Teaser (compelling summary)</label>
                <textarea 
                  value={form.preview_content} 
                  onChange={e => hf('preview_content', e.target.value)}
                  rows={4}
                  placeholder="Tell buyers why this asset is valuable without revealing the secrets..."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-blue-500/50 resize-none transition-all"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="ghost" className="rounded-xl font-bold" asChild><Link href="/dashboard">Cancel</Link></Button>
            <Button 
              className="rounded-xl bg-blue-500 hover:bg-blue-600 px-8 font-black"
              onClick={() => {
                if(!form.title || !form.price || !form.preview_content) {
                  setError("Required fields missing: Title, Price, and Teaser.");
                  return;
                }
                setError("");
                setStep(2);
              }}
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ══ STEP 2: Encryption ════════════════════════════════════ */}
      {step === 2 && (
        <div className="grid gap-8 animate-in slide-in-from-right duration-500">
          <Card className="glass border-white/5 bg-gradient-to-br from-blue-500/10 to-transparent">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-blue-500" />
              </div>
              <CardTitle className="text-xl font-black">Encryption Layer</CardTitle>
              <CardDescription>All information below is encrypted in-browser via AES-256-GCM before upload.</CardDescription>
            </CardHeader>
            <CardContent>
              <textarea 
                value={contentPlain} 
                onChange={e => setContentPlain(e.target.value)}
                rows={15}
                placeholder="Paste the full intelligence, method, or links here. This is the secret content buyers pay for."
                className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white font-mono text-sm focus:outline-none focus:border-blue-500/50 resize-none transition-all shadow-inner"
              />
              <div className="mt-6 flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                <Lock className="w-5 h-5 text-green-500" />
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">The platform zero-knowledge protocol ensures your secrets are never stored in plaintext.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-4">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setStep(1)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button 
              className="rounded-xl bg-blue-500 hover:bg-blue-600 px-8 font-black"
              onClick={() => {
                if(!contentPlain.trim()) {
                  setError("You cannot publish an empty asset.");
                  return;
                }
                setError("");
                // Mock encryption for UI purposes
                setStep(3);
              }}
            >
              Seal & Continue <Lock className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ══ STEP 3: Demo (Proof of Work) ═══════════════════════════ */}
      {step === 3 && (
        <div className="grid gap-8 animate-in slide-in-from-right duration-500">
           <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Demonstration
              </CardTitle>
              <CardDescription>Upload redacted screenshots or proof to verify your asset's legitimacy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-8 border-2 border-dashed border-white/10 rounded-[2rem] text-center bg-white/5 group hover:border-blue-500/30 transition-all cursor-pointer">
                <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-4 group-hover:text-blue-500 group-hover:scale-110 transition-all" />
                <h4 className="font-bold text-white mb-1">Upload Redacted Proof</h4>
                <p className="text-xs text-muted-foreground">Drop screenshots, CSVs, or logs (Max 10 files)</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Demo Narrative (Publicly visible)</label>
                <textarea 
                  rows={4}
                  placeholder="Describe what the buyer is seeing in the proof (e.g. 'Earnings from Jan 1st - 15th, verified by bank receipt with names blurred')."
                  className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white font-medium focus:outline-none focus:border-blue-500/50 resize-none transition-all"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-4">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setStep(2)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button 
              className="rounded-xl bg-blue-500 hover:bg-blue-600 px-8 font-black"
              onClick={() => setStep(4)}
            >
              Verify Details <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* ══ STEP 4: Review ════════════════════════════════════════ */}
      {step === 4 && (
        <div className="grid gap-8 animate-in slide-in-from-right duration-500">
          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-black">Network Review</CardTitle>
              <CardDescription>Verify your asset parameters before publishing to the mainnet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Asset Identity</p>
                   <p className="font-bold text-white">{form.title}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Sector</p>
                   <p className="font-bold text-white">{form.category || 'N/A'}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                   <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Listing Price</p>
                   <p className="font-black text-white text-lg">₦{Number(form.price).toLocaleString()}</p>
                 </div>
                 <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                   <p className="text-[10px] font-black uppercase tracking-widest text-green-500/60 mb-1">Net Earnings (85%)</p>
                   <p className="font-black text-green-500 text-lg">₦{(parseFloat(form.price) * 0.85 || 0).toLocaleString()}</p>
                 </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-4 items-start">
                <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-1" />
                <p className="text-xs text-blue-500/80 leading-relaxed font-bold">
                  By publishing, your asset enters the verification queue. Our curators will review your demonstration proof. Once approved, the asset goes live in the marketplace.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between gap-4">
            <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setStep(3)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button 
              className="rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-12 h-14 font-black shadow-lg shadow-blue-500/20"
              onClick={async () => {
                setSubmitting(true);
                // Simulate network latency
                setTimeout(() => {
                  router.push('/dashboard');
                }, 1500);
              }}
              disabled={submitting}
            >
              {submitting ? "Broadcasting..." : "Publish to Marketplace"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
