'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  ShoppingBag, 
  ShieldCheck, 
  Star, 
  Search, 
  MessageSquare, 
  ChevronRight, 
  AlertCircle,
  Clock,
  ExternalLink,
  Target,
  Bell,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/* ── Types ──────────────────────────────────────────────── */
interface Transaction {
  id: string; listing_title: string; listing_id?: string;
  amount: number; status: string;
  seller_username: string; buyer_username: string;
  created_at: string; expires_at?: string;
  encrypted_key?: string; review?: { rating: number };
}
interface Listing {
  id: string; title: string; price: number; status: string;
  view_count: number; purchase_count: number; category_name?: string;
  seller_username?: string; verification_score?: number;
}

/* ── Buyer Dashboard ─────────────────────────────────────── */
export default function BuyerDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab]             = useState<'overview' | 'purchases' | 'sellers'>('overview');
  const [stats, setStats]         = useState<any>(null);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);

  /* seller search */
  const [sellerQuery, setSellerQuery]     = useState('');
  const [sellerCategory, setSellerCategory] = useState('All');
  const [sellerResults, setSellerResults] = useState<any[]>([]);
  const [searching, setSearching]         = useState(false);
  const [hasSearched, setHasSearched]     = useState(false);
  const [openBountyCount, setOpenBountyCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    const load = async () => {
      try {
        const [statsRes, txRes, bountyRes] = await Promise.all([
          apiService.getUserStats(),
          apiService.getTransactions(),
          apiService.getMyBounties().catch(() => ({ data: { results: [] } })),
        ]);
        setStats(statsRes.data);
        const txns = txRes.data.results || txRes.data;
        setPurchases(txns.filter((t: Transaction) => t.buyer_username === user?.username));
        const bounties = bountyRes.data?.results || bountyRes.data || [];
        setOpenBountyCount(Array.isArray(bounties) ? bounties.filter((b: { status?: string }) => b.status !== 'closed').length : 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated, router, user]);

  const CATEGORIES = ['Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];

  const searchSellers = async (query = sellerQuery, cat = sellerCategory) => {
    setSearching(true);
    setHasSearched(true);
    try {
      const params: Record<string, string> = { ordering: '-purchase_count', page_size: '100' };
      if (query.trim())   params.search   = query.trim();
      if (cat !== 'All')  params.category = cat;

      const res = await apiService.client.get('/listings/', { params });
      const listings: Listing[] = res.data.results || res.data;

      const sellerMap = new Map<string, { username: string; categories: Set<string>; listingCount: number; totalSales: number }>();
      for (const l of listings) {
        if (!l.seller_username) continue;
        if (!sellerMap.has(l.seller_username)) {
          sellerMap.set(l.seller_username, { username: l.seller_username, categories: new Set(), listingCount: 0, totalSales: 0 });
        }
        const s = sellerMap.get(l.seller_username)!;
        s.listingCount++;
        s.totalSales += (l.purchase_count || 0);
        if (l.category_name) s.categories.add(l.category_name);
      }

      setSellerResults(
        Array.from(sellerMap.values()).map(s => ({
          username:     s.username,
          categories:   Array.from(s.categories),
          listingCount: s.listingCount,
          totalSales:   s.totalSales,
        }))
      );
    } catch { /* silent */ }
    finally { setSearching(false); }
  };

  const inEscrow = purchases.filter(p => p.status === 'escrow');

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-bold animate-pulse">Synchronizing Ledger...</p>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Stats Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Active purchases', value: purchases.filter((p) => p.status === 'released').length, href: '/dashboard/buyer', icon: ShoppingBag },
          { label: 'In escrow', value: inEscrow.length, href: '/dashboard/buyer/escrow', icon: ShieldCheck },
          { label: 'Open bounties', value: openBountyCount, href: '/bounties', icon: Target },
          { label: 'Risk inbox', value: '—', href: '/dashboard/buyer/notifications', icon: Bell, sub: 'Signals from trust systems appear here.' },
          { label: 'Wallet', value: `₦${Number(user?.wallet_balance ?? 0).toLocaleString()}`, href: '/dashboard/buyer/wallet', icon: Wallet },
        ].map((item, i) => (
          <Link key={i} href={item.href} className="block">
            <Card className="glass border-white/5 h-full hover:border-cyan-500/30 transition-colors">
              <CardContent className="p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <item.icon className="w-5 h-5 text-cyan-400/90" />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-black text-white">{item.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{item.label}</p>
                {'sub' in item && item.sub && <p className="text-[9px] text-muted-foreground leading-snug">{item.sub}</p>}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Purchases', value: stats?.total_purchases || 0, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Active Escrows', value: inEscrow.length, icon: ShieldCheck, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Buyer Reputation', value: `${Number(stats?.reputation_score || 0).toFixed(1)}/5`, icon: Star, color: 'text-green-500', bg: 'bg-green-500/10' },
        ].map((item, i) => (
          <Card key={i} className="glass border-white/5 overflow-hidden group hover:border-white/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={cn("p-4 rounded-2xl", item.bg)}>
                  <item.icon className={cn("w-6 h-6", item.color)} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight">{item.value}</h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs Content ──────────────────────────────────────── */}
      <div className="space-y-6">
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit">
          {['overview', 'purchases', 'sellers'].map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              onClick={() => setTab(t as any)}
              className={cn(
                "rounded-xl px-6 py-5 font-bold uppercase text-[10px] tracking-widest transition-all",
                tab === t ? "bg-white/10 text-white shadow-xl" : "text-muted-foreground hover:text-white"
              )}
            >
              {t}
            </Button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {tab === 'overview' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <Card className="glass border-white/5">
              <CardHeader>
                <CardTitle className="text-xl font-black">Recent Activity</CardTitle>
                <CardDescription>Your latest transactions and updates</CardDescription>
              </CardHeader>
              <CardContent>
                {purchases.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-10" />
                    <p className="text-muted-foreground font-bold italic">No recent activity found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {purchases.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-transparent hover:border-white/5 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          <span className="font-bold text-sm text-white">{p.listing_title}</span>
                        </div>
                        <StatusBadge status={p.status === 'released' ? 'Accepted' : (p.status === 'escrow' ? 'Pending' : p.status)} />
                      </div>
                    ))}
                    <Button variant="link" className="w-full text-blue-500 font-bold" onClick={() => setTab('purchases')}>
                      View all history <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="glass border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent">
              <CardHeader>
                <CardTitle className="text-xl font-black">Quick Tools</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <Button className="h-24 flex flex-col gap-2 rounded-3xl bg-white/5 hover:bg-white/10 border-white/5 border text-white font-black uppercase text-[10px] tracking-widest" variant="ghost" asChild>
                  <Link href="/listings">
                    <Search className="w-6 h-6 text-blue-500" />
                    Marketplace
                  </Link>
                </Button>
                <Button className="h-24 flex flex-col gap-2 rounded-3xl bg-white/5 hover:bg-white/10 border-white/5 border text-white font-black uppercase text-[10px] tracking-widest" variant="ghost" asChild>
                  <Link href="/chat">
                    <MessageSquare className="w-6 h-6 text-blue-500" />
                    Messages
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ── Tab: Purchases ── */}
        {tab === 'purchases' && (
          <Card className="glass border-white/5">
            <CardHeader>
              <CardTitle className="text-xl font-black">Purchase Vault</CardTitle>
              <CardDescription>Access your decrypted information assets</CardDescription>
            </CardHeader>
            <CardContent>
              {purchases.length === 0 ? (
                <div className="text-center py-24">
                  <ShoppingBag className="w-16 h-16 text-muted-foreground mx-auto mb-6 opacity-10" />
                  <h3 className="text-xl font-bold text-white mb-2">The vault is empty</h3>
                  <p className="text-muted-foreground mb-8">Purchase information from the marketplace to see it here.</p>
                  <Button className="rounded-full bg-blue-500 font-bold" asChild>
                    <Link href="/listings">Visit Marketplace</Link>
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                      <TableHead className="font-black text-white uppercase text-[10px]">Asset</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Seller</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Price</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Date</TableHead>
                      <TableHead className="font-black text-white uppercase text-[10px]">Status</TableHead>
                      <TableHead className="text-right font-black text-white uppercase text-[10px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.map((p) => (
                      <TableRow key={p.id} className="border-white/5 hover:bg-white/5 transition-colors group">
                        <TableCell className="font-bold py-5">{p.listing_title}</TableCell>
                        <TableCell className="text-muted-foreground font-medium">@{p.seller_username}</TableCell>
                        <TableCell className="font-black">₦{Number(p.amount).toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                           <StatusBadge status={p.status === 'released' ? 'Accepted' : (p.status === 'escrow' ? 'Pending' : p.status)} />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" className="rounded-xl border-white/10 hover:bg-white/10 font-bold text-xs" asChild>
                            <Link href={`/listing/${p.listing_id || '#'}`}>
                              View <ExternalLink className="w-3 h-3 ml-2 text-blue-500" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Tab: Sellers ── */}
        {tab === 'sellers' && (
          <div className="space-y-6">
            <Card className="glass border-white/5 overflow-hidden">
              <CardHeader className="bg-white/5 border-b border-white/5">
                <CardTitle className="text-xl font-black">Search Directory</CardTitle>
                <CardDescription>Find and verify intelligence providers</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input 
                      placeholder="Search by alias, keyword, or asset type..." 
                      value={sellerQuery}
                      onChange={(e) => setSellerQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchSellers()}
                      className="pl-12 h-14 bg-black/40 border-white/10 rounded-2xl focus:border-blue-500/50 text-white font-bold"
                    />
                  </div>
                  <Button size="lg" className="h-14 px-8 rounded-2xl bg-blue-500 font-black" onClick={() => searchSellers()} disabled={searching}>
                    {searching ? "Indexing..." : "Run Search"}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <Badge 
                    variant={sellerCategory === 'All' ? 'default' : 'outline'}
                    className={cn("cursor-pointer px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all", sellerCategory === 'All' ? "bg-blue-500 text-white" : "border-white/10 text-muted-foreground hover:border-white/20")}
                    onClick={() => { setSellerCategory('All'); searchSellers(sellerQuery, 'All'); }}
                  >
                    All Sectors
                  </Badge>
                  {CATEGORIES.map((cat) => (
                    <Badge 
                      key={cat}
                      variant={sellerCategory === cat ? 'default' : 'outline'}
                      className={cn("cursor-pointer px-4 py-1.5 rounded-full font-bold uppercase text-[10px] tracking-widest transition-all", sellerCategory === cat ? "bg-blue-500 text-white" : "border-white/10 text-muted-foreground hover:border-white/20")}
                      onClick={() => { setSellerCategory(cat); searchSellers(sellerQuery, cat); }}
                    >
                      {cat}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {hasSearched && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sellerResults.length === 0 ? (
                  <div className="col-span-full py-12 text-center glass border-white/5 rounded-3xl">
                    <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50" />
                    <p className="text-muted-foreground font-bold">No results found for your query.</p>
                  </div>
                ) : (
                  sellerResults.map((s) => (
                    <Card key={s.username} className="glass border-white/5 hover:border-blue-500/20 transition-all group">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-4 mb-6">
                          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-blue-500/10">
                            {s.username[0].toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-black text-white text-lg">@{s.username}</h4>
                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Verified Seller</p>
                          </div>
                        </div>

                        <div className="space-y-4 mb-6">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-bold">ACTIVE ASSETS</span>
                            <span className="text-white font-black">{s.listingCount}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground font-bold">TOTAL REPUTATION</span>
                            <span className="text-white font-black">{s.totalSales} Sales</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {s.categories.slice(0, 3).map((c: any) => (
                              <Badge key={c} variant="secondary" className="bg-white/5 text-[9px] font-black uppercase text-white/60 rounded-md">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="outline" className="rounded-xl border-white/10 hover:bg-white/10 font-bold" asChild>
                            <Link href={`/seller/${s.username}`}>Profile</Link>
                          </Button>
                          <Button size="sm" className="rounded-xl bg-blue-600 hover:bg-blue-700 font-bold" asChild>
                            <Link href={`/chat?with=${s.username}`}>Message</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
