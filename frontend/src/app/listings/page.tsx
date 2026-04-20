'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = ['All', 'Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];

interface Listing {
  id: string; title: string; description: string; preview_content: string;
  price: number; seller_username: string; seller_reputation: number;
  category_name: string; tags_list: string[]; view_count: number;
  purchase_count: number; is_featured: boolean; created_at: string;
}

function StarRating({ score }: { score: number }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} style={{ width: '11px', height: '11px', color: i <= Math.round(score) ? '#f79a32' : '#4b3422' }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span style={{ color: '#8a7359', fontSize: '0.7rem', marginLeft: '2px' }}>{score.toFixed(1)}</span>
    </span>
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
    <Link href={`/listing/${listing.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card" style={{ height: '100%', position: 'relative' }}>
        {listing.is_featured && (
          <span className="badge badge-orange" style={{ position: 'absolute', top: '0.75rem', right: '0.75rem' }}>
            Featured
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span className="badge badge-teal">{listing.category_name || 'General'}</span>
          {isAuthenticated && (
            <button onClick={toggleSave} style={{ background: 'none', border: 'none', cursor: 'pointer', color: saved ? '#f79a32' : '#5c4228', padding: '0.2rem' }}>
              <svg style={{ width: '16px', height: '16px' }} fill={saved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
          )}
        </div>
        <h3 className="line-clamp-2" style={{ fontSize: '0.875rem', marginBottom: '0.4rem' }}>{listing.title}</h3>
        <p className="line-clamp-2" style={{ fontSize: '0.775rem', color: '#8a7359', marginBottom: '0.6rem' }}>
          {listing.preview_content}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.6rem' }}>
          {listing.tags_list.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: '0.675rem', color: '#8a7359', background: 'rgba(75,52,34,0.5)', padding: '0.15rem 0.45rem', borderRadius: '999px' }}>
              #{tag}
            </span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(75,52,34,0.4)', paddingTop: '0.6rem' }}>
          <div>
            <p className="text-gradient" style={{ fontSize: '1rem', fontWeight: 800 }}>₦{Number(listing.price).toLocaleString()}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.15rem' }}>
              <span style={{ fontSize: '0.675rem', color: '#5c4228' }}>by</span>
              <span style={{ fontSize: '0.675rem', color: '#c0a472', fontWeight: 600 }}>{listing.seller_username}</span>
              <StarRating score={listing.seller_reputation} />
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.675rem', color: '#5c4228' }}>{listing.purchase_count} sold</p>
            <p style={{ fontSize: '0.675rem', color: '#5c4228' }}>{listing.view_count} views</p>
          </div>
        </div>
      </div>
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

  /* ── Auth loading skeleton — AFTER all hooks ── */
  if (isLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
    </main>
  );

  /* ── Not logged in → premium locked wall — AFTER all hooks ── */
  if (!isAuthenticated) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔒</div>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>
          <span className="text-gradient">Members-only</span> Marketplace
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#8a7359', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          The AIM Marketplace is only accessible to registered members.
          Create a free anonymous account — no email or ID required.
        </p>
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem', textAlign: 'left' }}>
          {['End-to-end encrypted listings', 'Escrow-protected payments', '12-hour escrow window', 'AI-generated anonymous identity'].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#c0a472', marginBottom: '0.5rem' }}>
              <span style={{ color: '#889b4a', flexShrink: 0 }}>✓</span>{f}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
          <Link href="/register" className="btn btn-primary">Create Free Account →</Link>
          <Link href="/login"    className="btn btn-secondary">Sign In</Link>
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.725rem', color: '#5c4228' }}>
          Already know what you need?{' '}
          <Link href="/features" style={{ color: '#8a7359' }}>Learn how AIM works →</Link>
        </p>
      </div>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Page header */}
      <section style={{
        borderBottom: '1px solid rgba(75,52,34,0.4)',
        background: 'rgba(44,31,18,0.4)',
        padding: '2rem 0 1.5rem',
      }}>
        <div className="container">
          <h1 style={{ marginBottom: '0.4rem' }}>
            <span className="text-gradient">Browse</span> the Marketplace
          </h1>
          <p style={{ fontSize: '0.8375rem', color: '#8a7359', marginBottom: '1.25rem' }}>
            Verified earning strategies — encrypted end-to-end, escrow-protected.
          </p>
          {/* Search */}
          <div style={{ position: 'relative', maxWidth: '480px' }}>
            <svg style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: '#8a7359' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="listing-search"
              type="text"
              placeholder="Search listings, strategies, keywords…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', paddingLeft: '2.25rem', paddingRight: '1rem' }}
            />
          </div>
        </div>
      </section>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => { setCategory(cat); setPage(1); }}
                style={{
                  padding: '0.3rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.775rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  border: '1px solid',
                  transition: 'all 0.15s ease',
                  background:   category === cat ? 'rgba(247,154,50,0.15)' : '#3c2818',
                  color:        category === cat ? '#f79a32'               : '#8a7359',
                  borderColor:  category === cat ? 'rgba(247,154,50,0.4)'  : '#4b3422',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            id="listing-sort"
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{ marginLeft: 'auto', minWidth: '140px' }}
          >
            <option value="-created_at">Newest</option>
            <option value="price">Price: Low → High</option>
            <option value="-price">Price: High → Low</option>
            <option value="-purchase_count">Most Popular</option>
            <option value="-view_count">Most Viewed</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid-container grid-responsive">
            {[...Array(8)].map((_, i) => (
              <div key={i} style={{ background: '#3c2818', borderRadius: '13px', height: '200px', opacity: 0.6 }}
                   className="fade-in" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: '#5c4228', fontSize: '0.9rem' }}>No listings found.</p>
            <Link href="/dashboard/create" style={{ color: '#f79a32', fontSize: '0.8rem', display: 'inline-block', marginTop: '0.5rem' }}>
              Be the first to list →
            </Link>
          </div>
        ) : (
          <div className="grid-container grid-responsive">
            {listings.map(l => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', marginTop: '2rem' }}>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                style={{
                  width: '32px', height: '32px',
                  borderRadius: '5px',
                  fontSize: '0.775rem', fontWeight: 500,
                  cursor: 'pointer', border: '1px solid',
                  background:   page === i + 1 ? 'rgba(247,154,50,0.15)' : '#3c2818',
                  color:        page === i + 1 ? '#f79a32'               : '#8a7359',
                  borderColor:  page === i + 1 ? 'rgba(247,154,50,0.4)'  : '#4b3422',
                  transition: 'all 0.15s ease',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
