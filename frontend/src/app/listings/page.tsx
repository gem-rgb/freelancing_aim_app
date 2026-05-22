'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  ShieldCheck, 
  Star, 
  Eye, 
  Bookmark, 
  ChevronLeft, 
  ChevronRight,
  Lock,
  ArrowRight,
  TrendingUp,
  Clock,
  LayoutGrid
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CATEGORIES = ['All', 'Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];

interface Listing {
  id: string; title: string; description: string; preview_content: string;
  price: number; seller_username: string; seller_reputation: number;
  category_name: string; tags_list: string[]; view_count: number;
  purchase_count: number; is_featured: boolean; created_at: string;
}

function StarRating({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star 
          key={i} 
          className={cn(
            "w-3 h-3",
            i <= Math.round(score) ? "fill-blue-500 text-blue-500" : "text-muted-foreground/30"
          )} 
        />
      ))}
      <span className="text-[10px] font-black text-muted-foreground ml-1">{score.toFixed(1)}</span>
    </div>
  );
}

function ListingCard({ listing }: { listing: Listing }) {
  const [saved, setSaved] = useState(false);
  const { isAuthenticated } = useAuth();

  const toggleSave = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isAuthenticated) return;
    try {
      if (saved) { await apiService.unsaveListing(listing.id); setSaved(false); }
      else        { await apiService.saveListing(listing.id);   setSaved(true);  }
    } catch {}
  };

  return (
    <Link href={`/listing/${listing.id}`}>
      <Card className="glass border-white/5 overflow-hidden group hover:border-blue-500/20 transition-all hover-glow h-full flex flex-col">
        <CardHeader className="p-0 relative h-2 items-center justify-center">
            {listing.is_featured && (
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-cyan-500 shadow-[0_0_10px_rgba(247,154,50,0.5)]" />
            )}
        </CardHeader>
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <Badge variant="secondary" className="bg-white/5 text-[9px] font-black uppercase text-white/60 tracking-widest rounded-md">
              {listing.category_name || 'General'}
            </Badge>
            {isAuthenticated && (
              <button 
                onClick={toggleSave} 
                className={cn(
                    "p-2 rounded-xl transition-colors",
                    saved ? "bg-blue-500/10 text-blue-500" : "text-muted-foreground hover:text-white"
                )}
              >
                <Bookmark className={cn("w-4 h-4", saved && "fill-current")} />
              </button>
            )}
          </div>

          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-blue-500 transition-colors">
              {listing.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
              {listing.preview_content}
            </p>
            
            <div className="flex flex-wrap gap-1.5 py-2">
                {listing.tags_list.slice(0, 3).map(tag => (
                  <span key={tag} className="text-[9px] font-bold text-muted-foreground/60 uppercase">#{tag}</span>
                ))}
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
            <div>
                <p className="text-xl font-black text-white tracking-tighter">₦{Number(listing.price).toLocaleString()}</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase">@{listing.seller_username}</span>
                    <StarRating score={listing.seller_reputation} />
                </div>
            </div>
            <div className="text-right">
                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase">
                    <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3 text-green-500" /> {listing.purchase_count}</span>
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3 text-blue-500" /> {listing.view_count}</span>
                </div>
                <div className="mt-1 text-[9px] font-bold text-muted-foreground/40 italic uppercase">Secure Escrow</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function MarketplacePage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [listings, setListings]     = useState<Listing[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const [sort, setSort]             = useState('-created_at');
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchListings = async (q = search, cat = category, ord = sort, pg = page) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: pg, ordering: ord };
      if (q) params.search   = q;
      if (cat !== 'All') params.category = cat;
      const res = await apiService.getListings(params as any);
      const data = res.data;
      setListings(data.results || data);
      if (data.count) setTotalPages(Math.ceil(data.count / 20));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(); }, [category, sort, page]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { fetchListings(search); }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  if (isLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Accessing Marketplace...</p>
    </div>
  );

  if (!isAuthenticated) return (
    <main className="min-h-screen flex items-center justify-center p-6 pt-32 bg-background">
      <div className="max-w-xl w-full text-center space-y-8 animate-fade-in">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-blue-500/20">
          <Lock className="w-10 h-10 text-white" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Encrypted <span className="text-gradient">Marketplace</span>
          </h1>
          <p className="text-muted-foreground leading-relaxed font-medium">
            The AIM network requires authenticated credentials to browse active intelligence assets. Our protocol ensures complete anonymity and zero-knowledge protection.
          </p>
        </div>

        <Card className="glass border-white/5 text-left p-2">
            <CardContent className="grid gap-4 py-6">
                {[
                    { label: 'End-to-End Encryption', desc: 'Listing content is browser-sealed' },
                    { label: 'Escrow Protection', desc: 'Secure funds release after verification' },
                    { label: 'Anonymous Identity', desc: 'Zero identity exposure required' }
                ].map((f, i) => (
                    <div key={i} className="flex items-center gap-4 group">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                            <ShieldCheck className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-black text-white uppercase tracking-tight">{f.label}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">{f.desc}</p>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Button className="h-14 px-8 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-blue-500/20" asChild>
            <Link href="/register">Initialize Account</Link>
          </Button>
          <Button variant="outline" className="h-14 px-8 rounded-2xl border-white/10 text-white font-black uppercase text-xs tracking-widest hover:bg-white/5" asChild>
            <Link href="/login">Resume Session</Link>
          </Button>
        </div>
        
        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em] pt-8">
          AIM — Distributed Intelligence Network
        </p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen pb-24 pt-32">
      {/* Search Header */}
      <section className="bg-white/5 border-b border-white/5 py-16 px-6">
        <div className="max-w-7xl mx-auto space-y-8">
          <div>
            <h1 className="text-4xl font-black text-white tracking-tight mb-2">
              Browse <span className="text-gradient">Marketplace</span>
            </h1>
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px]">
              {listings.length} Active Intelligence Assets Found
            </p>
          </div>

          <div className="relative max-w-2xl group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
            <Input 
              placeholder="Search listings, strategies, keywords..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-16 pl-14 bg-black/40 border-white/10 rounded-2xl focus:border-blue-500/50 text-white font-bold shadow-2xl"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <Badge 
                key={cat}
                variant={category === cat ? "default" : "outline"}
                className={cn(
                    "cursor-pointer px-5 py-2 rounded-full font-black uppercase text-[10px] tracking-widest transition-all",
                    category === cat ? "bg-blue-500 text-white" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-white"
                )}
                onClick={() => { setCategory(cat); setPage(1); }}
              >
                {cat}
              </Badge>
            ))}
          </div>

          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:min-w-[200px]">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select 
                    value={sort}
                    onChange={e => setSort(e.target.value)}
                    className="w-full h-11 pl-10 pr-4 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-white appearance-none focus:outline-none focus:border-blue-500/50"
                >
                    <option value="-created_at">Newest Deployment</option>
                    <option value="price">Price: Low → High</option>
                    <option value="-price">Price: High → Low</option>
                    <option value="-purchase_count">High Reputation</option>
                </select>
            </div>
            <Button variant="outline" className="h-11 w-11 rounded-xl border-white/10 p-0 hover:bg-white/5">
                <LayoutGrid className="w-4 h-4 text-white" />
            </Button>
          </div>
        </div>

        {/* Listings Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-[300px] bg-white/5 border border-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-32 space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto border border-white/5">
                <ShoppingBag className="w-8 h-8 text-muted-foreground/30" />
            </div>
            <div className="space-y-2">
                <p className="text-white font-black uppercase tracking-tight text-xl">No Intelligence Assets Found</p>
                <p className="text-muted-foreground text-sm">Modify your filters or deploy a new asset to the marketplace.</p>
            </div>
            <Button className="rounded-full bg-blue-500 font-bold px-8" asChild>
                <Link href="/dashboard/create">Deploy New Asset</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-700 slide-in-from-bottom-4">
              {listings.map(l => <ListingCard key={l.id} listing={l} />)}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-12">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-xl border-white/10 hover:bg-white/5 disabled:opacity-20"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="w-4 h-4" />
                </Button>
                
                <div className="flex items-center gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                        <Button 
                            key={i}
                            variant={page === i + 1 ? "default" : "outline"}
                            size="sm"
                            className={cn(
                                "w-10 h-10 rounded-xl font-black text-[10px] transition-all",
                                page === i + 1 ? "bg-blue-500 text-white" : "border-white/10 text-muted-foreground hover:bg-white/5"
                            )}
                            onClick={() => setPage(i + 1)}
                        >
                            {i + 1}
                        </Button>
                    ))}
                </div>

                <Button 
                    variant="outline" 
                    size="icon" 
                    className="rounded-xl border-white/10 hover:bg-white/5 disabled:opacity-20"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                >
                    <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
