'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

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

function StarRating({ rating, size = '1rem' }: { rating: number; size?: string }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#f79a32' : '#3c2818', fontSize: size }}>★</span>
      ))}
    </span>
  );
}

function Avatar({ username, avatarUrl, size = 80 }: { username: string; avatarUrl?: string; size?: number }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt={username} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(247,154,50,0.3)' }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg,#f79a32,#dc3d22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 800, color: '#fff',
      border: '3px solid rgba(247,154,50,0.3)', flexShrink: 0,
    }}>
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
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '36px', height: '36px' }} />
    </main>
  );

  if (notFound || !profile) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🕵️</div>
        <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Seller not found</h1>
        <p style={{ color: '#8a7359', marginBottom: '1rem', fontSize: '0.875rem' }}>
          This seller may not exist or their profile is private.
        </p>
        <Link href="/listings" className="btn btn-primary">Browse Marketplace →</Link>
      </div>
    </main>
  );

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <main style={{ minHeight: '100vh', paddingBottom: '4rem' }}>
      <div className="container" style={{ maxWidth: '820px', paddingTop: '2rem' }}>

        {/* Breadcrumb */}
        <nav style={{ fontSize: '0.775rem', color: '#8a7359', marginBottom: '1.5rem' }}>
          <Link href="/listings" style={{ color: '#8a7359' }}>Marketplace</Link>
          <span style={{ margin: '0 0.4rem' }}>›</span>
          <span style={{ color: '#d3af86' }}>Seller: {profile.username}</span>
        </nav>

        {/* ── Profile Hero ── */}
        <div className="card" style={{ padding: '2rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Avatar username={profile.username} avatarUrl={profile.avatar_url} size={88} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                <h1 style={{ fontSize: '1.375rem' }}>{profile.username}</h1>
                {profile.is_verified && (
                  <span style={{ fontSize: '0.7rem', padding: '0.18rem 0.55rem', borderRadius: '999px', background: 'rgba(57,173,181,0.12)', color: '#39adb5', fontWeight: 600 }}>
                    ✓ Verified
                  </span>
                )}
              </div>

              {profile.avg_rating !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  <StarRating rating={profile.avg_rating} />
                  <span style={{ fontSize: '0.8rem', color: '#f79a32', fontWeight: 600 }}>{profile.avg_rating}</span>
                  <span style={{ fontSize: '0.75rem', color: '#5c4228' }}>({profile.reviews.length} review{profile.reviews.length !== 1 ? 's' : ''})</span>
                </div>
              )}

              {profile.bio && (
                <p style={{ fontSize: '0.85rem', color: '#c0a472', lineHeight: 1.6, marginBottom: '0.5rem' }}>{profile.bio}</p>
              )}

              <p style={{ fontSize: '0.725rem', color: '#5c4228' }}>Member since {memberSince}</p>
            </div>

            {/* CTA */}
            {isAuthenticated && (
              <Link href={`/chat?with=${profile.username}`} className="btn btn-primary btn-sm" style={{ flexShrink: 0 }}>
                💬 Message Seller
              </Link>
            )}
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid #3c2818' }}>
            {[
              { label: 'Active Listings', value: profile.total_listings, icon: '📦', color: '#f79a32' },
              { label: 'Total Sales',     value: profile.total_sales,    icon: '✅', color: '#a0b85e' },
              { label: 'Avg Rating',      value: profile.avg_rating !== null ? `${profile.avg_rating} ⭐` : 'No ratings yet', icon: '🏆', color: '#39adb5' },
            ].map(s => (
              <div key={s.label} style={{ textAlign: 'center', padding: '0.75rem', background: 'rgba(60,40,24,0.5)', borderRadius: '8px' }}>
                <div style={{ fontSize: '1.25rem', marginBottom: '0.2rem' }}>{s.icon}</div>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', color: s.color, marginBottom: '0.1rem' }}>{s.value}</p>
                <p style={{ fontSize: '0.7rem', color: '#5c4228' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div role="tablist" style={{ display: 'flex', gap: '0.25rem', background: '#3c2818', borderRadius: '9px', padding: '0.25rem', width: 'fit-content', marginBottom: '1.25rem' }}>
          {[
            { id: 'listings' as const, label: `📦 Listings (${profile.listings.length})` },
            { id: 'reviews'  as const, label: `⭐ Reviews (${profile.reviews.length})` },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} role="tab" aria-selected={activeTab === t.id}
              style={{ padding: '0.3rem 0.9rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: activeTab === t.id ? 600 : 500, cursor: 'pointer', border: 'none', background: activeTab === t.id ? 'rgba(247,154,50,0.15)' : 'transparent', color: activeTab === t.id ? '#f79a32' : '#8a7359', transition: 'all 0.15s ease' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Listings grid ── */}
        {activeTab === 'listings' && (
          profile.listings.length === 0
            ? <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: '#8a7359' }}>This seller has no active listings.</p>
              </div>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {profile.listings.map((l: any) => (
                  <Link key={l.id} href={`/listing/${l.id}`} style={{ textDecoration: 'none' }}>
                    <article className="card" style={{ padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.2s', height: '100%' }}>
                      {/* Preview media thumbnail */}
                      {l.preview_media?.length > 0 && l.preview_media[0].media_type === 'image' && (
                        <img src={l.preview_media[0].file_url} alt="" style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '7px', marginBottom: '0.75rem' }} />
                      )}
                      <h3 style={{ fontSize: '0.875rem', marginBottom: '0.35rem', color: '#d3af86' }}>{l.title}</h3>
                      {l.category_name && <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '5px', background: 'rgba(247,154,50,0.1)', color: '#f79a32' }}>{l.category_name}</span>}
                      <p style={{ fontSize: '0.75rem', color: '#8a7359', marginTop: '0.5rem', lineHeight: 1.5 }}>
                        {l.preview_content?.slice(0, 80)}{(l.preview_content?.length ?? 0) > 80 ? '…' : ''}
                      </p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f79a32' }}>₦{Number(l.price).toLocaleString()}</span>
                        <span style={{ fontSize: '0.68rem', color: '#5c4228' }}>{l.purchase_count} sold</span>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )
        )}

        {/* ── Reviews ── */}
        {activeTab === 'reviews' && (
          profile.reviews.length === 0
            ? <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                <p style={{ color: '#8a7359' }}>No reviews yet. Be the first to leave one after a purchase!</p>
              </div>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {profile.reviews.map((r, i) => (
                  <div key={i} className="card" style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#39adb5,#2c8b91)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: '#fff' }}>
                          {r.reviewer[0]?.toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#c0a472' }}>{r.reviewer}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <StarRating rating={r.rating} size="0.9rem" />
                        <span style={{ fontSize: '0.72rem', color: '#5c4228' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    {r.comment && <p style={{ fontSize: '0.8rem', color: '#8a7359', lineHeight: 1.6 }}>{r.comment}</p>}
                  </div>
                ))}
              </div>
            )
        )}

      </div>
    </main>
  );
}
