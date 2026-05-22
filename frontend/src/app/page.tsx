'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Lock, UserCheck, Star, MessageSquare, Target, CheckCircle, ArrowRight } from 'lucide-react';

interface Listing {
  id: string; title: string; preview_content: string; price: number;
  seller_username: string; seller_reputation: number;
  category_name: string; purchase_count: number;
}

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user?.is_staff)              router.replace('/admin/dashboard');
    else if (user?.user_type === 'seller') router.replace('/dashboard');
    else                             router.replace('/listings');
  }, [isLoading, isAuthenticated, user, router]);

  useEffect(() => {
    apiService.getListings({ featured: 'true', page: 1 } as any)
      .then(r => setFeaturedListings((r.data.results || r.data).slice(0, 3)))
      .catch(() => {});
  }, []);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-black selection:bg-blue-500/30 selection:text-white font-sans text-slate-200">
      
      {/* ── Trade Ideas Inspired Hero Section ──────────────────────── */}
      <section className="relative pt-32 pb-24 overflow-hidden border-b border-white/5 bg-gradient-to-b from-[#050505] to-black">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-[140px] -z-10 animate-pulse" />
        
        <div className="container mx-auto px-6 relative z-10 max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 text-center lg:text-left space-y-8">
              <div className="inline-flex items-center gap-2 py-1 px-3 rounded-full border border-blue-500/30 bg-blue-500/10 animate-fade-in">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Agentic Escrow Network</span>
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-black tracking-tighter leading-[1.1] text-white">
                Anonymous Information <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Marketplace</span>
              </h1>

              <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 font-medium">
                The secure layer for distributed intelligence. No more unverified assets. Our consensus network cryptographically verifies strategies before escrow release.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4 pt-4">
                <Button size="lg" className="h-14 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-sm font-bold uppercase tracking-wide transition-all text-white" asChild>
                  <Link href="/listings">Browse the Market</Link>
                </Button>
                <Button size="lg" variant="outline" className="h-14 px-8 rounded-xl border-white/20 bg-black hover:bg-white/5 text-sm font-bold uppercase tracking-wide text-white" asChild>
                  <Link href="/features">More Info</Link>
                </Button>
              </div>
            </div>

            <div className="lg:w-1/2 w-full relative">
              <div className="absolute inset-0 bg-cyan-500/10 blur-[80px] rounded-full -z-10" />
              <Card className="border border-white/10 bg-black/50 backdrop-blur-xl shadow-2xl overflow-hidden rounded-2xl">
                <CardHeader className="bg-white/5 border-b border-white/5 py-4">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="flex border-b border-white/5">
                    <div className="w-1/3 p-4 border-r border-white/5 bg-white/[0.02]">
                       <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Active Nodes</div>
                       <div className="text-2xl font-black text-white">2,400+</div>
                    </div>
                    <div className="w-1/3 p-4 border-r border-white/5 bg-white/[0.02]">
                       <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Volume</div>
                       <div className="text-2xl font-black text-white">18K+</div>
                    </div>
                    <div className="w-1/3 p-4 bg-white/[0.02]">
                       <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1">Dispute Rate</div>
                       <div className="text-2xl font-black text-cyan-400">&lt; 2%</div>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="h-4 w-3/4 bg-white/5 rounded" />
                    <div className="h-4 w-full bg-white/5 rounded" />
                    <div className="h-4 w-5/6 bg-white/5 rounded" />
                    <div className="mt-8 flex items-center justify-between">
                       <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-0">Live Data Sync</Badge>
                       <span className="text-xs font-mono text-slate-500">AES-256 Encrypted</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ── Handshake AI Inspired Trending Opportunities ─────────── */}
      {featuredListings.length > 0 && (
        <section className="py-24 bg-[#0a0a0a] border-b border-white/5">
          <div className="container mx-auto px-6 max-w-5xl">
            <h2 className="text-3xl font-bold mb-10 text-white">Trending opportunities</h2>
            
            <div className="flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black shadow-xl">
              {featuredListings.map((l, i) => (
                <div key={l.id} className="group flex flex-col md:flex-row md:items-center justify-between p-6 border-b border-white/10 last:border-0 hover:bg-white/[0.02] transition-colors gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-blue-400 group-hover:underline cursor-pointer truncate">
                        <Link href={`/listing/${l.id}`}>{l.title}</Link>
                      </h3>
                    </div>
                    <div className="text-sm text-slate-400 truncate mb-3">{l.preview_content}</div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs border-white/20 text-slate-400 font-medium rounded-md bg-transparent">
                        {l.category_name}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-white/20 text-slate-400 font-medium rounded-md bg-transparent">
                        <Star className="w-3 h-3 text-yellow-500 mr-1" /> {l.seller_reputation?.toFixed(1) || '0.0'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-1">Up to</span>
                      <span className="text-2xl font-black text-white">₦{Number(l.price).toLocaleString()}</span>
                    </div>
                    <Button className="w-full md:w-auto bg-white text-black hover:bg-slate-200 font-bold px-8 rounded-full shadow-lg" asChild>
                      <Link href={`/listing/${l.id}`}>Apply</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-8 text-center md:text-left">
              <Link href="/listings" className="text-blue-400 font-bold hover:underline inline-flex items-center">
                View all opportunities <ArrowRight className="ml-1 w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Trade Ideas Split Features ───────────────────────────── */}
      <section className="py-24 bg-black border-b border-white/5">
        <div className="container mx-auto px-6 max-w-6xl space-y-32">
          
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="text-sm font-black text-blue-500 uppercase tracking-widest">Protocol Enforced Escrow</div>
              <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">
                Cryptographic Fraud Detection & Consensus Verification
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Buy with zero risk. Before escrow releases your funds, the seller's encrypted strategy is fragmented into chunks and verified by a decentralized network of managers for plagiarism and malware.
              </p>
              <Button variant="outline" className="border-white/20 hover:bg-white/5 font-bold uppercase tracking-wider h-12 px-8 text-white" asChild>
                <Link href="/bounties">View Bounties</Link>
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <div className="aspect-video bg-gradient-to-br from-blue-900/40 to-black border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center p-8">
                <Target className="w-32 h-32 text-blue-500/50" />
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row-reverse items-center gap-16">
            <div className="w-full md:w-1/2 space-y-6">
              <div className="text-sm font-black text-cyan-500 uppercase tracking-widest">Zero-Knowledge Architecture</div>
              <h2 className="text-4xl font-bold text-white tracking-tight leading-tight">
                End-to-End Encrypted Communications
              </h2>
              <p className="text-lg text-slate-400 leading-relaxed">
                Your real identity is never exposed. The system provides you with a locally generated RSA keypair. All communications, files, and disputes are AES-256 encrypted before they ever reach our servers.
              </p>
              <Button variant="outline" className="border-white/20 hover:bg-white/5 font-bold uppercase tracking-wider h-12 px-8 text-white" asChild>
                <Link href="/register">Initialize Node</Link>
              </Button>
            </div>
            <div className="w-full md:w-1/2">
              <div className="aspect-video bg-gradient-to-tr from-cyan-900/40 to-black border border-white/10 rounded-2xl shadow-2xl flex items-center justify-center p-8">
                <Shield className="w-32 h-32 text-cyan-500/50" />
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── Handshake AI Benefits Grid ───────────────────────────── */}
      <section className="py-24 bg-[#0a0a0a] border-b border-white/5">
        <div className="container mx-auto px-6 max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-16">Benefits</h2>
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <Lock className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Work securely</h3>
              <p className="text-slate-400 leading-relaxed">Remote, zero-knowledge architecture you can use anytime. No third-party data tracking.</p>
            </div>
            <div>
              <Star className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Earn competitive pay</h3>
              <p className="text-slate-400 leading-relaxed">Get paid via secure escrow for high-impact intelligence, no matter your background.</p>
            </div>
            <div>
              <UserCheck className="w-8 h-8 text-white mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">Anonymous reputation</h3>
              <p className="text-slate-400 leading-relaxed">Earn credentials and grow algorithmic reputation—no real-world identity required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Call to Action ───────────────────────────────────────── */}
      <section className="py-24 relative overflow-hidden bg-black">
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl lg:text-6xl font-black text-white tracking-tighter">
              Get paid to turn your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">expertise into impact.</span>
            </h2>
            <div className="flex flex-wrap justify-center gap-4 pt-8">
              <Button size="lg" className="h-14 px-10 rounded-full bg-blue-600 hover:bg-blue-700 text-lg font-bold text-white shadow-xl shadow-blue-500/20" asChild>
                <Link href="/register">Sign up now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
