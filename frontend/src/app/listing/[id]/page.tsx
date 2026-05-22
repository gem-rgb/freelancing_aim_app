'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  Lock, 
  Clock, 
  Star, 
  ShoppingBag, 
  MessageSquare, 
  ChevronLeft, 
  Eye, 
  TrendingUp, 
  Zap,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Phone,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Listing {
  id: string;
  title: string;
  description: string;
  preview_content: string;
  encrypted_content_url: string;
  price: number;
  seller_username: string;
  seller_reputation: number;
  seller_public_key: string;
  category_name: string;
  tags_list: string[];
  view_count: number;
  purchase_count: number;
  created_at: string;
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star 
          key={i} 
          className={cn(
            "w-3.5 h-3.5",
            i <= Math.round(score) ? "fill-blue-500 text-blue-500" : "text-muted-foreground/30"
          )} 
        />
      ))}
      <span className="text-xs font-black text-muted-foreground ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

function PurchaseModal({ listing, open, onOpenChange }: { listing: Listing; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { user } = useAuth();
  type Step = 'method' | 'mpesa_phone' | 'processing' | 'done_paystack' | 'done_mpesa' | 'error';
  const [step, setStep]     = useState<Step>('method');
  const [method, setMethod] = useState<'paystack' | 'mpesa'>('paystack');
  const [phone, setPhone]   = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [mpesaMsg, setMpesaMsg] = useState('');
  const [err, setErr]       = useState('');

  const fee   = Math.round(Number(listing.price) * 0.15);
  const total = Number(listing.price) + fee;

  const initiatePaystack = async () => {
    setStep('processing');
    try {
      const buyerPublicKey = localStorage.getItem(`pk_${user?.id}`) || '';
      const res = await apiService.initiateTransaction({ listing_id: listing.id, buyer_public_key: buyerPublicKey });
      setPayUrl(res.data.authorization_url);
      setStep('done_paystack');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Payment failed. Try again.');
      setStep('error');
    }
  };

  const initiateMpesa = async () => {
    if (!phone.trim()) return;
    setStep('processing');
    try {
      const res = await apiService.initiateMpesa({ listing_id: listing.id, phone: phone.trim() });
      setMpesaMsg(res.data.message || 'Check your phone to complete the M-Pesa payment.');
      setStep('done_mpesa');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'M-Pesa initiation failed. Try again.');
      setStep('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-white/10 sm:max-w-[420px] p-0 overflow-hidden">
        <div className="p-6 space-y-6">
            <DialogHeader>
            <DialogTitle className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                Secure Purchase
            </DialogTitle>
            <DialogDescription className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
                Escrow Protected Transaction
            </DialogDescription>
            </DialogHeader>

            {/* Price Summary */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <span>Base Asset</span>
                    <span className="text-white">₦{Number(listing.price).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    <span>Protocol Fee (15%)</span>
                    <span className="text-white">₦{fee.toLocaleString()}</span>
                </div>
                <Separator className="bg-white/10" />
                <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-blue-500 uppercase tracking-widest">Total Payable</span>
                    <span className="text-2xl font-black text-white tracking-tighter">₦{total.toLocaleString()}</span>
                </div>
            </div>

            {step === 'method' && (
                <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <Button 
                            variant="outline" 
                            className={cn(
                                "h-24 flex flex-col gap-2 rounded-2xl transition-all",
                                method === 'paystack' ? "bg-blue-500/10 border-blue-500 text-blue-500 shadow-lg shadow-blue-500/10" : "border-white/10 text-muted-foreground hover:bg-white/5"
                            )}
                            onClick={() => setMethod('paystack')}
                        >
                            <CreditCard className="w-6 h-6" />
                            <span className="font-black uppercase text-[10px] tracking-widest">Paystack</span>
                        </Button>
                        <Button 
                            variant="outline" 
                            className={cn(
                                "h-24 flex flex-col gap-2 rounded-2xl transition-all",
                                method === 'mpesa' ? "bg-green-500/10 border-green-500 text-green-500 shadow-lg shadow-green-500/10" : "border-white/10 text-muted-foreground hover:bg-white/5"
                            )}
                            onClick={() => setMethod('mpesa')}
                        >
                            <Phone className="w-6 h-6" />
                            <span className="font-black uppercase text-[10px] tracking-widest">M-Pesa</span>
                        </Button>
                    </div>

                    <Button 
                        className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20"
                        onClick={() => method === 'mpesa' ? setStep('mpesa_phone') : initiatePaystack()}
                    >
                        {method === 'mpesa' ? 'Enter Phone Details' : 'Initialize Paystack Session'}
                    </Button>
                </div>
            )}

            {step === 'mpesa_phone' && (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Safaricom Number</label>
                        <Input 
                            placeholder="e.g. 0712345678" 
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            className="h-12 bg-white/5 border-white/10 rounded-xl focus:border-green-500/50 font-bold"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <Button variant="ghost" className="rounded-xl font-bold" onClick={() => setStep('method')}>Back</Button>
                        <Button className="rounded-xl bg-green-600 hover:bg-green-700 font-black" onClick={initiateMpesa}>Send STK Push</Button>
                    </div>
                </div>
            )}

            {step === 'processing' && (
                <div className="py-12 flex flex-col items-center gap-4 text-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <p className="font-bold text-white tracking-tight">Generating Secure Transaction Hash...</p>
                </div>
            )}

            {step === 'done_paystack' && (
                <div className="space-y-4 py-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto border border-green-500/20">
                        <Zap className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="font-black text-white text-lg">Transaction Linked</h3>
                        <p className="text-xs text-muted-foreground font-medium px-8">Paystack authorization ready. Return here after completion to unlock the asset.</p>
                    </div>
                    <Button className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest" asChild>
                        <a href={payUrl} target="_blank" rel="noopener noreferrer">Proceed to External Paystack <ArrowRight className="w-4 h-4 ml-2" /></a>
                    </Button>
                </div>
            )}

            {step === 'done_mpesa' && (
                <div className="space-y-4 py-4">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto border border-green-500/20">
                        <Phone className="w-8 h-8 text-green-500" />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="font-black text-white text-lg">STK Push Injected</h3>
                        <p className="text-xs text-muted-foreground font-medium">{mpesaMsg}</p>
                    </div>
                    <Button className="w-full h-14 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase text-xs tracking-widest" onClick={() => onOpenChange(false)}>Close - Monitor via Dashboard</Button>
                </div>
            )}

            {step === 'error' && (
                <div className="py-8 text-center space-y-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto border border-red-500/20">
                        <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <p className="text-sm text-red-400 font-bold px-6">{err}</p>
                    <Button variant="ghost" className="text-blue-500 font-black text-xs uppercase tracking-widest" onClick={() => setStep('method')}>Back to Selection</Button>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams() as { id: string };
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=/listing/${id}`);
      return;
    }
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      apiService.getListing(id)
        .then(res => { setListing(res.data); setLoading(false); })
        .catch(() => router.push('/listings'));
    }
  }, [id, isLoading, isAuthenticated, router]);

  if (isLoading || (loading && isAuthenticated)) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Retrieving Asset Ledger...</p>
    </div>
  );

  if (!isAuthenticated || !listing) return null;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <main className="min-h-screen pb-24 pt-8 animate-fade-in">
      <PurchaseModal listing={listing} open={showModal} onOpenChange={setShowModal} />
      
      <div className="max-w-7xl mx-auto px-6 space-y-8">
        {/* Navigation */}
        <Button variant="ghost" className="text-muted-foreground hover:text-white font-bold" asChild>
          <Link href="/listings">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Marketplace
          </Link>
        </Button>

        <div className="grid lg:grid-cols-[1fr,360px] gap-8 items-start">
          {/* Main Content */}
          <div className="space-y-8">
            <Card className="glass border-white/5 overflow-hidden">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-3 mb-6">
                  <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full">
                    {listing.category_name || 'General Sector'}
                  </Badge>
                  <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3 h-3" /> Deployed {fmtDate(listing.created_at)}
                  </span>
                </div>
                <h1 className="text-4xl font-black text-white tracking-tighter leading-tight mb-4">
                  {listing.title}
                </h1>
                
                <div className="flex flex-wrap gap-2">
                  {listing.tags_list.map(t => (
                    <span key={t} className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest">#{t}</span>
                  ))}
                </div>
              </CardHeader>

              <CardContent className="p-8 pt-4 space-y-12">
                <div className="flex items-center gap-6 p-4 rounded-[2rem] bg-white/5 border border-white/5">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-500/10">
                    {listing.seller_username[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-1">Provider Alias</p>
                    <Link href={`/seller/${listing.seller_username}`} className="text-lg font-black text-white hover:text-blue-500 transition-colors">
                      @{listing.seller_username}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2 text-right">Reputation Score</p>
                    <StarRating score={listing.seller_reputation} />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Asset Intelligence Narrative</h3>
                  <p className="text-muted-foreground leading-relaxed font-medium text-lg whitespace-pre-wrap">
                    {listing.description}
                  </p>
                </div>

                <Separator className="bg-white/5" />

                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <Eye className="w-5 h-5 text-blue-500" />
                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Intelligence Preview</h3>
                  </div>
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <Lock className="w-12 h-12 text-white" />
                    </div>
                    <p className="text-muted-foreground font-medium italic leading-relaxed">
                        &quot;{listing.preview_content}&quot;
                    </p>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3 items-center">
                    <ShieldCheck className="w-5 h-5 text-blue-500" />
                    <p className="text-[10px] font-black text-blue-500/80 uppercase tracking-widest">The full payload is end-to-end encrypted. Unlocked only after successful network escrow.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8 sticky top-24">
            <Card className="glass border-white/5 overflow-hidden group">
              <div className="p-8 space-y-6">
                <div>
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 text-center">Asset Acquisition Value</p>
                  <h2 className="text-5xl font-black text-center tracking-tighter text-white">
                    <span className="text-gradient">₦{Number(listing.price).toLocaleString()}</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
                   <div className="text-center py-2">
                      <p className="text-2xl font-black text-white">{listing.purchase_count}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Holders</p>
                   </div>
                   <div className="text-center py-2 border-l border-white/5">
                      <p className="text-2xl font-black text-white">{listing.view_count}</p>
                      <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Inquiries</p>
                   </div>
                </div>

                {user?.user_type === 'buyer' ? (
                  <Button 
                    className="w-full h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-[0.1em] shadow-2xl shadow-blue-500/20"
                    onClick={() => setShowModal(true)}
                  >
                    🛒 Initialize Purchase
                  </Button>
                ) : (
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Restricted Action</p>
                    <p className="text-xs text-white/60 font-bold mt-1">Sellers cannot purchase assets.</p>
                  </div>
                )}

                {listing.seller_username !== user?.username && (
                   <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 hover:bg-white/5 font-black uppercase text-xs tracking-widest" asChild>
                      <Link href={`/chat?with=${listing.seller_username}`}>
                        <MessageSquare className="w-4 h-4 mr-2" /> Message Provider
                      </Link>
                   </Button>
                )}
              </div>
            </Card>

            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Platform Guarantees</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { icon: ShieldCheck, label: 'Protocol Escrow', color: 'text-green-500', bg: 'bg-green-500/10' },
                  { icon: Lock, label: 'E2EE Payload', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { icon: Clock, label: '72h Dispute Layer', color: 'text-blue-500', bg: 'bg-blue-500/10' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", item.bg)}>
                        <item.icon className={cn("w-4 h-4", item.color)} />
                    </div>
                    <span className="text-[10px] font-black text-white/80 uppercase tracking-widest">{item.label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
