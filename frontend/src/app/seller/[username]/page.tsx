'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Star, 
  ShieldCheck, 
  ShoppingBag, 
  MessageSquare, 
  ChevronLeft, 
  User, 
  Calendar, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  Award,
  Package,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SellerProfile {
  username: string;
  reputation_score: number;
  is_verified: boolean;
  bio: string;
  avatar_url: string;
  created_at: string;
  total_sales: number;
  avg_rating: number | null;
  total_listings: number;
  listings: any[];
  reviews: { reviewer: string; rating: number; comment: string; created_at: string }[];
}

function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star 
          key={i} 
          className={cn(
            "w-3.5 h-3.5",
            i <= Math.round(rating) ? "fill-blue-500 text-blue-500" : "text-muted-foreground/30"
          )} 
        />
      ))}
    </div>
  );
}

function Avatar({ username, avatarUrl, size = 100 }: { username: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} style={{ width: size, height: size }} className="rounded-[2rem] object-cover border-4 border-white/5 shadow-2xl shadow-blue-500/10" />;
  }
  return (
    <div 
        style={{ width: size, height: size }} 
        className="rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-4xl shadow-2xl shadow-blue-500/20 border-4 border-white/5"
    >
      {username[0]?.toUpperCase()}
    </div>
  );
}

export default function SellerProfilePage() {
  const params  = useParams();
  const router  = useRouter();
  const { isAuthenticated } = useAuth();
  const username = params?.username as string;

  const [profile, setProfile]   = useState<SellerProfile | null>(null);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeTab, setActiveTab] = useState<'listings' | 'reviews'>('listings');

  useEffect(() => {
    if (!username) return;
    const fetchProfile = async () => {
      try {
        const res = await apiService.client.get(`/auth/sellers/${username}/`);
        setProfile(res.data);
      } catch (e: any) {
        if (e.response?.status === 404) setNotFound(true);
      } finally { setLoading(false); }
    };
    fetchProfile();
  }, [username]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground font-black uppercase tracking-widest text-[10px]">Scanning Provider Metadata...</p>
    </div>
  );

  if (notFound || !profile) return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in">
        <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center mx-auto border border-white/10">
          <User className="w-10 h-10 text-muted-foreground/30" />
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-black text-white tracking-tight">Provider <span className="text-gradient">Not Found</span></h1>
          <p className="text-muted-foreground leading-relaxed font-medium">The requested node is either offline or does not exist in the marketplace directory.</p>
        </div>
        <Button className="h-14 px-8 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20" asChild>
          <Link href="/listings">Return to Marketplace</Link>
        </Button>
      </div>
    </main>
  );

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main className="min-h-screen pb-24 pt-8 animate-fade-in">
      <div className="max-w-5xl mx-auto px-6 space-y-8">
        {/* Breadcrumb */}
        <Button variant="ghost" className="text-muted-foreground hover:text-white font-bold" asChild>
          <Link href="/listings">
            <ChevronLeft className="w-4 h-4 mr-2" /> Back to Marketplace
          </Link>
        </Button>

        {/* Hero Card */}
        <Card className="glass border-white/5 overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
            <Award className="w-48 h-48 text-white" />
          </div>
          
          <CardContent className="p-8 md:p-12 space-y-12">
            <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
              <Avatar username={profile.username} avatarUrl={profile.avatar_url} size={120} />
              
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-4xl font-black text-white tracking-tighter">@{profile.username}</h1>
                    {profile.is_verified && (
                        <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 font-black uppercase text-[10px] tracking-widest px-4 py-1.5 rounded-full">
                            <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verified Provider
                        </Badge>
                    )}
                </div>

                {profile.avg_rating !== null && (
                    <div className="flex items-center gap-4">
                        <StarRating rating={profile.avg_rating} />
                        <span className="text-lg font-black text-blue-500 tracking-tighter">{profile.avg_rating}</span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">({profile.reviews.length} Network Reviews)</span>
                    </div>
                )}

                {profile.bio && (
                    <p className="text-muted-foreground font-medium leading-relaxed max-w-2xl">{profile.bio}</p>
                )}

                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    <Calendar className="w-3.5 h-3.5" /> Node Initialized {memberSince}
                </div>
              </div>

              {isAuthenticated && (
                <Button className="h-14 px-8 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-2xl shadow-blue-500/20" asChild>
                    <Link href={`/chat?with=${profile.username}`}>
                        <MessageSquare className="w-4 h-4 mr-3" /> Transmit Message
                    </Link>
                </Button>
              )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
                {[
                    { label: 'Active Assets', value: profile.total_listings, icon: Package, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Successful Sales', value: profile.total_sales, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10' },
                    { label: 'Network Reputation', value: profile.reputation_score, icon: Award, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Trust Rating', value: profile.avg_rating !== null ? `${profile.avg_rating}/5` : 'N/A', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                ].map((s, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2 group/stat hover:bg-white/[0.07] transition-all">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border border-transparent group-hover/stat:border-current transition-all", s.bg, s.color)}>
                            <s.icon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-lg font-black text-white tracking-tighter">{s.value}</p>
                            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Tabs Section */}
        <div className="space-y-6 pt-4">
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit">
                {[
                    { id: 'listings' as const, label: `Intelligence Assets (${profile.listings.length})`, icon: Package },
                    { id: 'reviews'  as const, label: `Verification Logs (${profile.reviews.length})`, icon: ShieldCheck },
                ].map((t) => (
                    <Button
                        key={t.id}
                        variant="ghost"
                        size="sm"
                        onClick={() => setActiveTab(t.id)}
                        className={cn(
                            "rounded-xl px-6 py-5 font-bold uppercase text-[10px] tracking-widest transition-all gap-2",
                            activeTab === t.id ? "bg-white/10 text-white shadow-xl" : "text-muted-foreground hover:text-white"
                        )}
                    >
                        <t.icon className="w-3.5 h-3.5" />
                        {t.label}
                    </Button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="animate-in fade-in duration-500 slide-in-from-bottom-4">
                {activeTab === 'listings' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {profile.listings.length === 0 ? (
                            <div className="col-span-full py-20 text-center opacity-30 italic font-medium">No active assets deployed by this provider.</div>
                        ) : (
                            profile.listings.map((l: any) => (
                                <Link key={l.id} href={`/listing/${l.id}`}>
                                    <Card className="glass border-white/5 overflow-hidden h-full group hover:border-blue-500/20 transition-all hover-glow flex flex-col">
                                        <CardContent className="p-6 flex flex-col h-full">
                                            <div className="flex-1 space-y-4">
                                                <Badge variant="secondary" className="bg-white/5 text-[9px] font-black uppercase text-white/60 tracking-widest rounded-md">
                                                    {l.category_name || 'General'}
                                                </Badge>
                                                <h3 className="text-lg font-black text-white leading-tight line-clamp-2 group-hover:text-blue-500 transition-colors">
                                                    {l.title}
                                                </h3>
                                                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                                    {l.preview_content}
                                                </p>
                                            </div>
                                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                                <p className="text-xl font-black text-white tracking-tighter">₦{Number(l.price).toLocaleString()}</p>
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 group-hover:bg-blue-500 transition-all">
                                                    <ArrowRight className="w-5 h-5 text-blue-500 group-hover:text-white" />
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))
                        )}
                    </div>
                )}

                {activeTab === 'reviews' && (
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {profile.reviews.length === 0 ? (
                            <div className="py-20 text-center opacity-30 italic font-medium">No verification logs available for this node.</div>
                        ) : (
                            profile.reviews.map((r, i) => (
                                <Card key={i} className="glass border-white/5 group hover:bg-white/[0.03] transition-all">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-xs">
                                                    {r.reviewer[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-white tracking-tight">@{r.reviewer}</p>
                                                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <StarRating rating={r.rating} />
                                        </div>
                                        <p className="text-sm text-muted-foreground font-medium leading-relaxed pl-14">{r.comment}</p>
                                    </CardContent>
                                </Card>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
      </div>
    </main>
  );
}
