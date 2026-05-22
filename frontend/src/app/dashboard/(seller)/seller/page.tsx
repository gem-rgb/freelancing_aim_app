'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  TrendingUp, 
  Package, 
  DollarSign, 
  Star, 
  Plus, 
  Trash2, 
  Edit, 
  Eye, 
  CheckCircle,
  AlertCircle,
  Calculator as CalcIcon,
  HelpCircle,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SELLER_SALE_STAKE_RATE, buildStakeLineItems } from '@/services/escrow';

/* ── Types ─────────────────────────────────────────────── */
interface Transaction {
  id: string; listing_title: string; amount: number; status: string;
  seller_username: string; buyer_username: string;
  created_at: string; expires_at?: string; encrypted_key?: string;
  review?: { rating: number };
}
interface Listing {
  id: string; title: string; price: number; status: string;
  view_count: number; purchase_count: number; created_at: string;
  category_name?: string;
}

/* ── Seller Dashboard ──────────────────────────────────── */
export default function SellerDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [stats, setStats]           = useState<any>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [sales, setSales]           = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Calculator State
  const [calcAmount, setCalcAmount] = useState<string>('10000');
  const [calcResult, setCalcResult] = useState<number>(8500);

  const load = useCallback(async () => {
    try {
      const [statsRes, listRes, txRes] = await Promise.all([
        apiService.getUserStats(),
        apiService.getMyListings(),
        apiService.getTransactions(),
      ]);
      setStats(statsRes.data);
      setMyListings(listRes.data.results || listRes.data);
      const txns = txRes.data.results || txRes.data;
      setSales(txns.filter((t: Transaction) => t.seller_username === user?.username));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    load();
  }, [isAuthenticated, load, router]);

  useEffect(() => {
    const amount = parseFloat(calcAmount) || 0;
    setCalcResult(amount * 0.85); // 15% platform fee
  }, [calcAmount]);

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    setDeletingId(id);
    try {
      await apiService.client.delete(`/listings/${id}/`);
      setMyListings(prev => prev.filter(l => l.id !== id));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalRevenue = sales.filter(s => s.status === 'released').reduce((s, t) => s + Number(t.amount), 0);
  const escrowAmount = sales.filter(s => s.status === 'escrow').reduce((s, t) => s + Number(t.amount), 0);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-bold animate-pulse">Initializing Terminal...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Listings', value: myListings.filter(l => l.status === 'active').length, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Released Funds', value: `₦${(totalRevenue * 0.85).toLocaleString()}`, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-500/10' },
          { label: 'In Escrow', value: `₦${(escrowAmount * 0.85).toLocaleString()}`, icon: DollarSign, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
          { label: 'Trust Score', value: `${Number(stats?.reputation_score || 0).toFixed(1)}/5`, icon: Star, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((item, i) => (
          <Card key={i} className="glass border-white/5 overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl", item.bg)}>
                  <item.icon className={cn("w-6 h-6", item.color)} />
                </div>
                {i === 1 && <div className="text-[10px] font-black text-green-500 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" /> +12%</div>}
              </div>
              <div className="mt-4">
                <h3 className="text-2xl font-black text-white tracking-tight">{item.value}</h3>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="glass border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 to-transparent">
        <CardHeader>
          <CardTitle className="text-lg font-black text-white">Sale stake & escrow</CardTitle>
          <CardDescription>
            {Math.round(SELLER_SALE_STAKE_RATE * 100)}% of each sale is held in stake until verification completes. Visualized from your open transactions; wire to explicit stake ledger fields when the API exposes them.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4">
          {buildStakeLineItems(sales.filter((s) => s.status === 'escrow')).slice(0, 3).map((row) => (
            <div key={row.transactionId} className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-2">
              <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Txn {row.transactionId.slice(0, 8)}…</p>
              <p className="text-sm text-white font-bold">Gross ₦{row.grossAmount.toLocaleString()}</p>
              <p className="text-xs text-cyan-300 font-black">Locked stake ₦{row.lockedStake.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Verification: {row.verificationStatus}</p>
            </div>
          ))}
          {sales.filter((s) => s.status === 'escrow').length === 0 && (
            <p className="text-sm text-muted-foreground md:col-span-3">No sales currently in escrow. When buyers pay, stake lines will appear here.</p>
          )}
          <div className="md:col-span-3 pt-2">
            <Button variant="outline" className="rounded-xl border-cyan-500/30 text-cyan-400 font-bold" asChild>
              <Link href="/dashboard/seller/escrow-stake">Open escrow dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* ── Main Content: Listings & Sales ────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          <Card className="glass border-white/5">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-xl font-black">My Inventory</CardTitle>
                <CardDescription>Manage your encrypted information assets</CardDescription>
              </div>
              <Button size="sm" className="rounded-full bg-blue-500 font-bold" asChild>
                <Link href="/dashboard/create"><Plus className="w-4 h-4 mr-2" /> New Asset</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {myListings.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-bold">No assets found in your inventory</p>
                  <Button variant="link" className="text-blue-500 font-bold mt-2" asChild>
                    <Link href="/dashboard/create">Deploy your first strategy →</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="font-black text-white uppercase text-[10px]">Asset Name</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Price</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Stats</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Status</TableHead>
                      <TableHead className="text-right font-black text-white uppercase text-[10px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myListings.map((l) => (
                      <TableRow key={l.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="font-bold py-4">
                          <div className="flex flex-col">
                            <span className="text-sm">{l.title}</span>
                            <span className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">{l.category_name || 'Uncategorized'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-black">₦{Number(l.price).toLocaleString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-4 text-[10px] font-black text-muted-foreground uppercase">
                            <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {l.view_count}</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> {l.purchase_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={l.status === 'active' ? 'Accepted' : l.status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" asChild>
                              <Link href={`/dashboard/edit/${l.id}`}><Edit className="w-4 h-4" /></Link>
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => deleteListing(l.id)} disabled={deletingId === l.id}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-black">Sales History</CardTitle>
              <CardDescription>Track your revenue and escrow status</CardDescription>
            </CardHeader>
            <CardContent>
              {sales.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground font-bold italic">No sales transactions recorded yet.</p>
              ) : (
                <div className="space-y-4">
                  {sales.map((t) => (
                    <div key={t.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-blue-500/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-xl", t.status === 'released' ? 'bg-green-500/10' : 'bg-yellow-500/10')}>
                          {t.status === 'released' ? <CheckCircle className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-yellow-500" />}
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-white">{t.listing_title}</h4>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">
                            Buyer: {t.buyer_username} · {new Date(t.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-black text-white">₦{Number(t.amount).toLocaleString()}</div>
                        <StatusBadge status={t.status === 'released' ? 'Accepted' : (t.status === 'escrow' ? 'Pending' : t.status)} className="mt-1" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar: Calculator & FAQ ─────────────────────────── */}
        <div className="space-y-8">
          {/* Earnings Calculator */}
          <Card className="bg-gradient-to-br from-blue-600/20 to-red-900/20 border-white/10 overflow-hidden relative group">
            <div className="absolute -top-12 -right-12 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CalcIcon className="w-5 h-5 text-blue-500" />
                <span className="font-black">Fee Calculator</span>
              </CardTitle>
              <CardDescription className="text-white/60">Estimate your net earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-white/50 tracking-widest">Listing Price (₦)</label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={calcAmount} 
                    onChange={(e) => setCalcAmount(e.target.value)}
                    className="bg-black/40 border-white/10 text-white font-black text-lg h-12 rounded-xl focus:border-blue-500/50"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 font-black">NGN</div>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                <div className="flex justify-between text-xs text-white/60">
                  <span>Platform Fee (15%)</span>
                  <span className="font-bold text-red-400">- ₦{(parseFloat(calcAmount) * 0.15 || 0).toLocaleString()}</span>
                </div>
                <div className="h-[1px] bg-white/5" />
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black text-white uppercase tracking-widest">Net Profit</span>
                  <span className="text-xl font-black text-green-500 tracking-tighter">₦{calcResult.toLocaleString()}</span>
                </div>
              </div>
              <p className="text-[10px] text-white/40 italic text-center">
                *Platform fees include escrow protection and end-to-end encryption hosting.
              </p>
            </CardContent>
          </Card>

          {/* Quick FAQ */}
          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" />
                <span className="font-black text-lg">Seller FAQ</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { q: 'How do I get paid?', a: 'Funds are released after the buyer confirms receipt or the 72h window expires.' },
                { q: 'What is the escrow fee?', a: 'We charge a flat 15% to maintain the network and secure transactions.' },
                { q: 'Is my data safe?', a: 'Yes. All asset content is encrypted in-browser before upload.' },
              ].map((faq, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-bold text-white group-hover:text-blue-500 transition-colors">{faq.q}</h5>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{faq.a}</p>
                </div>
              ))}
              <Button variant="outline" className="w-full mt-4 rounded-xl border-white/5 bg-white/5 hover:bg-white/10 font-bold py-6">
                Full Help Center
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
