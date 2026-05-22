'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Star, 
  MessageSquare, 
  Target, 
  CheckCircle2, 
  ArrowRight,
  ChevronRight,
  Zap,
  Globe,
  Award,
  Scale,
  Cpu,
  Fingerprint
} from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Lock,
    slug: 'encryption',
    title: 'End-to-End Encryption',
    tagline: 'AES-256-GCM in your browser. Server sees only ciphertext.',
    highlight: 'Zero-Knowledge',
    highlightColor: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    detail: [
      'Your listing content is encrypted locally before any upload',
      'RSA-2048 keypair generated in your browser — private key never leaves',
      'Buyer receives the decryption key only after escrow release',
    ],
  },
  {
    icon: ShieldCheck,
    slug: 'escrow',
    title: 'Escrow Protection',
    tagline: 'Funds locked until delivery confirmed. No exceptions.',
    highlight: '72-hr Dispute Window',
    highlightColor: 'text-green-400',
    bgColor: 'bg-green-400/10',
    detail: [
      'Payments held via Paystack — AIM never holds your money directly',
      'Content key released only on buyer confirmation or timeout',
      'Admin-arbitrated disputes with evidence from both parties',
    ],
  },
  {
    icon: Fingerprint,
    slug: 'anonymous',
    title: 'Full Anonymity',
    tagline: 'No email. No phone. No real name. Ever.',
    highlight: 'No Identity Required',
    highlightColor: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
    detail: [
      'AI-generated usernames — no personal-info patterns',
      'RSA keypair acts as your cryptographic identity',
      'Even AIM cannot link your account to a real person',
    ],
  },
  {
    icon: Award,
    slug: 'reputation',
    title: 'Reputation & Staking',
    tagline: 'Trust earned through performance. Enforced by incentive.',
    highlight: 'Skin-in-the-Game',
    highlightColor: 'text-red-400',
    bgColor: 'bg-red-400/10',
    detail: [
      'Weighted score from verified completed transactions',
      'Stake tokens to boost your listing — lose them on dispute',
      'Buyers rate 1–5 after every release',
    ],
  },
  {
    icon: MessageSquare,
    slug: 'e2ee-chat',
    title: 'E2EE Messaging',
    tagline: 'RSA-encrypted WebSocket chat. Server relays only noise.',
    highlight: 'Server-Blind Relay',
    highlightColor: 'text-purple-400',
    bgColor: 'bg-purple-400/10',
    detail: [
      'Every message encrypted with the recipient\'s RSA public key',
      'Database stores only ciphertext — zero plaintext exposure',
      'Decrypt locally with your private key (never uploaded)',
    ],
  },
  {
    icon: Target,
    slug: 'bounty-board',
    title: 'Bounty Board',
    tagline: 'Post a problem. Get competing encrypted solutions.',
    highlight: 'Competitive Delivery',
    highlightColor: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10',
    detail: [
      'Attach a reward to a specific research or info request',
      'Sellers submit encrypted solutions — buyer decrypts to review',
      'Escrow holds reward until the best submission is accepted',
    ],
  },
];

const HOW_IT_WORKS = [
  { step: '01', icon: Dices, title: 'Generate Anonymous Identity', desc: 'An AI-generated username and RSA-2048 keypair are created in your browser. Zero personal data used.' },
  { step: '02', icon: Lock, title: 'Encrypt Your Content', desc: 'AES-256-GCM seals your asset in your browser before upload. The server never sees the plaintext.' },
  { step: '03', icon: Target, title: 'Deploy with Proof', desc: 'Attach redacted screenshots or logs to prove legitimacy. Staff approval ensures network quality.' },
  { step: '04', icon: Zap, title: 'Escrow Transaction', desc: 'Funds are held in a secure protocol escrow. No money moves until delivery is verified.' },
  { step: '05', icon: Key, title: 'Cipher Release', desc: 'You release the decryption key to the buyer. Upon receipt, escrow releases the funds to your node.' },
];

import { Dices, Key } from 'lucide-react';

export default function FeaturesPage() {
  return (
    <main className="min-h-screen pb-24 animate-fade-in pt-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 pointer-events-none opacity-5">
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-500 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600 rounded-full blur-[120px]" />
        </div>
        
        <div className="max-w-4xl mx-auto px-6 relative z-10 space-y-8">
          <nav className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-white">Protocol Features</span>
          </nav>
          
          <div className="space-y-4">
            <h1 className="text-6xl font-black text-white tracking-tighter leading-tight">
                Privacy is the <span className="text-gradient">Architecture</span>.
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed max-w-2xl">
                Every feature of the AIM network is designed around a single principle: <span className="text-white">neither the platform nor any third party can see what you trade.</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <Button size="lg" className="h-14 px-8 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20" asChild>
                <Link href="/register">Initialize Node</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase text-xs tracking-widest" asChild>
                <Link href="/listings">Explore Assets</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
                <Card key={i} className="glass border-white/5 group hover:border-white/20 transition-all hover-glow overflow-hidden">
                    <CardContent className="p-8 space-y-6">
                        <div className="flex items-start justify-between">
                            <div className={cn("p-4 rounded-2xl border border-transparent group-hover:border-current transition-all", f.bgColor, f.highlightColor)}>
                                <f.icon className="w-8 h-8" />
                            </div>
                            <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-black text-[9px] uppercase tracking-widest border-transparent", f.bgColor, f.highlightColor)}>
                                {f.highlight}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-white tracking-tight">{f.title}</h3>
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{f.tagline}</p>
                        </div>

                        <Separator className="bg-white/5" />

                        <ul className="space-y-3">
                            {f.detail.map((d, di) => (
                                <li key={di} className="flex gap-3 text-xs font-bold text-muted-foreground/80 leading-normal">
                                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                    {d}
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
      </section>

      {/* How it Works */}
      <section className="bg-white/5 border-y border-white/5 py-32 px-6 overflow-hidden relative">
        <div className="max-w-5xl mx-auto space-y-16">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-black text-white tracking-tight">The Transaction <span className="text-gradient">Protocol</span></h2>
                <p className="text-muted-foreground font-medium uppercase tracking-widest text-[10px]">From Initial Handshake to Final Settlement</p>
            </div>

            <div className="relative space-y-4">
                {/* Connecting Line */}
                <div className="absolute left-10 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/0 hidden md:block" />

                {HOW_IT_WORKS.map((h, i) => (
                    <div key={i} className="flex flex-col md:flex-row gap-8 items-center md:items-start group">
                        <div className="w-20 h-20 rounded-[2.5rem] bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 relative z-10 group-hover:border-blue-500/50 transition-all shadow-xl group-hover:shadow-blue-500/10">
                            <h4 className="absolute -top-3 -left-3 text-[10px] font-black text-blue-500 bg-background border border-blue-500/20 rounded-lg px-2 py-1">{h.step}</h4>
                            <h.icon className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-2 pt-4">
                            <h3 className="text-xl font-black text-white tracking-tight uppercase">{h.title}</h3>
                            <p className="text-muted-foreground font-medium leading-relaxed max-w-xl">{h.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      </section>

      {/* Security Callout */}
      <section className="max-w-5xl mx-auto px-6 py-32">
        <Card className="glass border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent overflow-hidden">
            <CardContent className="p-12 space-y-12">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    <div className="w-20 h-20 rounded-3xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 flex-shrink-0">
                        <Cpu className="w-10 h-10 text-blue-500" />
                    </div>
                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-white tracking-tighter uppercase">Security by <span className="text-gradient">Architecture</span></h2>
                        <p className="text-lg text-muted-foreground font-medium leading-relaxed">
                            Most platforms promise privacy through policy. AIM enforces it through mathematics. Even if compelled, AIM cannot hand over what it does not have — your plaintext content, your private key, or your real identity are all outside the server's reach.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { icon: Lock, text: 'AES-256-GCM Content' },
                        { icon: Key, text: 'RSA-2048 Handshake' },
                        { icon: Globe, text: 'TLS Edge Protection' },
                        { icon: Zap, text: 'Escrow Settlements' },
                        { icon: ShieldCheck, text: 'Verification Protocol' },
                        { icon: Scale, text: 'Arbitration Layer' },
                    ].map((item, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 group hover:bg-white/10 transition-all">
                            <item.icon className="w-5 h-5 text-blue-500" />
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{item.text}</span>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-6 text-center space-y-8">
        <div className="space-y-4">
            <h2 className="text-4xl font-black text-white tracking-tight uppercase">Ready to Transmit <span className="text-gradient">Securely</span>?</h2>
            <p className="text-muted-foreground font-medium text-lg leading-relaxed px-12">
                Join the distributed network of intelligence traders. No exposure. Just commerce.
            </p>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
            <Button size="lg" className="h-16 px-12 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20" asChild>
                <Link href="/register">Initialize Account</Link>
            </Button>
            <Button variant="outline" size="lg" className="h-16 px-12 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase text-xs tracking-widest" asChild>
                <Link href="/listings">Browse Directory</Link>
            </Button>
        </div>
      </section>
    </main>
  );
}
