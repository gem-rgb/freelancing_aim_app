'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

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

/* ── Helpers ────────────────────────────────────────────── */
const TX_STATUS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: 'rgba(247,154,50,0.1)',  color: '#f79a32' },
  escrow:    { bg: 'rgba(57,173,181,0.1)',  color: '#39adb5' },
  released:  { bg: 'rgba(136,155,74,0.1)',  color: '#889b4a' },
  disputed:  { bg: 'rgba(220,61,34,0.1)',   color: '#dc3d22' },
  refunded:  { bg: 'rgba(138,115,89,0.1)',  color: '#8a7359' },
  cancelled: { bg: 'rgba(92,66,40,0.1)',    color: '#5c4228' },
};

function StatusPill({ status }: { status: string }) {
  const s = TX_STATUS[status] || { bg: 'rgba(75,52,34,0.3)', color: '#8a7359' };
  return (
    <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.18rem 0.6rem', borderRadius: '999px', background: s.bg, color: s.color }}>
      {status}
    </span>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>{icon}</div>
      <p style={{ fontSize: '1.25rem', fontWeight: 800, color, marginBottom: '0.15rem' }}>{value}</p>
      <p style={{ fontSize: '0.725rem', color: '#8a7359' }}>{label}</p>
    </div>
  );
}

function EscrowCountdown({ expiresAt }: { expiresAt?: string }) {
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!expiresAt) return;
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setRemaining('Releasing soon…'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(`${h}h ${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span style={{ color: '#39adb5', fontWeight: 600 }}>{remaining}</span>;
}

function ReviewForm({ transactionId, onDone }: { transactionId: string; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    setLoading(true);
    try { await apiService.createReview(transactionId, { rating, comment }); onDone(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to submit review'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(136,155,74,0.07)', border: '1px solid rgba(136,155,74,0.2)', borderRadius: '9px' }}>
      <p style={{ fontSize: '0.775rem', fontWeight: 600, color: '#a0b85e', marginBottom: '0.6rem' }}>⭐ Rate this seller</p>
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.6rem' }}>
        {[1,2,3,4,5].map(i => (
          <button key={i} onClick={() => setRating(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.3rem', color: i <= rating ? '#f79a32' : '#4b3422', transition: 'color 0.1s' }}>★</button>
        ))}
        <span style={{ fontSize: '0.725rem', color: '#8a7359', marginLeft: '0.25rem', lineHeight: '2rem' }}>{rating}/5</span>
      </div>
      <textarea value={comment} onChange={e => setComment(e.target.value)}
        placeholder="Describe your experience (optional)…" rows={2}
        style={{ width: '100%', resize: 'none', fontSize: '0.775rem', marginBottom: '0.5rem' }} />
      <button onClick={submit} disabled={loading} className="btn btn-sm"
        style={{ background: 'rgba(136,155,74,0.15)', color: '#a0b85e', border: '1px solid rgba(136,155,74,0.3)', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Submitting…' : 'Submit Review'}
      </button>
    </div>
  );
}

function DisputeForm({ transactionId, onDone }: { transactionId: string; onDone: () => void }) {
  const [claim, setClaim] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (!claim.trim()) return;
    setLoading(true);
    try { await apiService.createDispute(transactionId, { buyer_claim: claim }); onDone(); }
    catch (e: any) { alert(e.response?.data?.error || 'Failed to open dispute'); }
    finally { setLoading(false); }
  };
  return (
    <div style={{ marginTop: '0.75rem', padding: '1rem', background: 'rgba(220,61,34,0.07)', border: '1px solid rgba(220,61,34,0.2)', borderRadius: '9px' }}>
      <p style={{ fontSize: '0.775rem', fontWeight: 600, color: '#f2704a', marginBottom: '0.5rem' }}>⚖️ Open a Dispute</p>
      <textarea value={claim} onChange={e => setClaim(e.target.value)}
        placeholder="Describe your issue clearly. This will be sent to the seller and admin." rows={3}
        style={{ width: '100%', resize: 'none', fontSize: '0.775rem', marginBottom: '0.5rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button onClick={submit} disabled={loading || !claim.trim()} className="btn btn-sm"
          style={{ background: 'rgba(220,61,34,0.12)', color: '#f2704a', border: '1px solid rgba(220,61,34,0.3)', opacity: (loading || !claim.trim()) ? 0.5 : 1 }}>
          {loading ? 'Submitting…' : 'Submit Dispute'}
        </button>
        <button onClick={onDone} className="btn btn-ghost btn-sm">Cancel</button>
      </div>
    </div>
  );
}

/* ── Buyer Dashboard ─────────────────────────────────────── */
export default function BuyerDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab]             = useState<'overview' | 'purchases' | 'sellers'>('overview');
  const [stats, setStats]         = useState<any>(null);
  const [purchases, setPurchases] = useState<Transaction[]>([]);
  const [loading, setLoading]     = useState(true);
  const [reviewFor, setReviewFor] = useState<string | null>(null);
  const [disputeFor, setDisputeFor] = useState<string | null>(null);

  /* seller search */
  const [sellerQuery, setSellerQuery]     = useState('');
  const [sellerCategory, setSellerCategory] = useState('All');
  const [sellerResults, setSellerResults] = useState<any[]>([]);
  const [searching, setSearching]         = useState(false);
  const [hasSearched, setHasSearched]     = useState(false);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    const load = async () => {
      try {
        const [statsRes, txRes] = await Promise.all([
          apiService.getUserStats(),
          apiService.getTransactions(),
        ]);
        setStats(statsRes.data);
        const txns = txRes.data.results || txRes.data;
        setPurchases(txns.filter((t: Transaction) => t.buyer_username === user?.username));
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [isAuthenticated]);

  const confirmReceipt = async (txId: string) => {
    try {
      await apiService.confirmTransaction(txId);
      setPurchases(prev => prev.map(t => t.id === txId ? { ...t, status: 'released' } : t));
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to confirm'); }
  };

  const CATEGORIES = ['Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];

  const searchSellers = async (query = sellerQuery, cat = sellerCategory) => {
    if (!query.trim() && cat === 'All') return;
    setSearching(true);
    setHasSearched(true);
    try {
      const params: Record<string, string> = { ordering: '-purchase_count', page_size: '100' };
      if (query.trim())   params.search   = query.trim();
      if (cat !== 'All')  params.category = cat;

      const res = await apiService.client.get('/listings/', { params });
      const listings: Listing[] = res.data.results || res.data;

      /* Group by seller — track categories + listing count + total sales */
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

  const inEscrow = purchases.filter(p => p.status === 'escrow').length;

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '36px', height: '36px' }} />
    </div>
  );

  const TABS = [
    { id: 'overview', label: '🏠 Overview' },
    { id: 'purchases', label: `🛒 My Purchases${purchases.length ? ` (${purchases.length})` : ''}` },
    { id: 'sellers', label: '🔍 Find Sellers' },
  ] as const;

  return (
    <main style={{ minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', marginBottom: '0.2rem' }}>Buyer Dashboard</h1>
            <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>
              Welcome back, <span style={{ color: '#f79a32', fontWeight: 600 }}>{user?.username}</span>
            </p>
          </div>
          <Link href="/listings" className="btn btn-primary btn-sm">🛒 Browse Marketplace</Link>
        </div>

        {/* Stats */}
        {stats && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <StatCard label="Total Purchases"  value={stats.total_purchases || 0} icon="🛒" color="#39adb5" />
            <StatCard label="In Escrow"        value={inEscrow}                   icon="🔒" color="#f79a32" />
            <StatCard label="Reputation"       value={`${Number(stats.reputation_score || 0).toFixed(1)} ⭐`} icon="🏆" color="#a0b85e" />
          </section>
        )}

        {/* Escrow alert banner */}
        {inEscrow > 0 && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(57,173,181,0.08)', border: '1px solid rgba(57,173,181,0.25)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#39adb5' }}>
              🔒 <strong>{inEscrow}</strong> purchase(s) in escrow — funds auto-release to seller after 12 hours.
            </span>
            <button onClick={() => setTab('purchases')} className="btn btn-ghost btn-sm">View →</button>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" style={{ display: 'flex', gap: '0.25rem', background: '#3c2818', borderRadius: '9px', padding: '0.25rem', width: 'fit-content', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} role="tab" aria-selected={tab === t.id}
              style={{ padding: '0.3rem 0.9rem', borderRadius: '6px', fontSize: '0.775rem', fontWeight: tab === t.id ? 600 : 500, cursor: 'pointer', border: 'none', background: tab === t.id ? 'rgba(247,154,50,0.15)' : 'transparent', color: tab === t.id ? '#f79a32' : '#8a7359', transition: 'all 0.15s ease', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab: Overview ── */}
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <Link href="/listings" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>🛒 Browse Marketplace</Link>
                <Link href="/chat"     className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>💬 Messages</Link>
                <button onClick={() => setTab('sellers')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>🔍 Find Sellers</button>
                <button onClick={() => setTab('purchases')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>📋 My Purchases</button>
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Recent Purchases</h3>
              {purchases.length === 0
                ? <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>No purchases yet. <Link href="/listings" style={{ color: '#f79a32' }}>Browse listings →</Link></p>
                : purchases.slice(0, 3).map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #3c2818' }}>
                    <span style={{ fontSize: '0.775rem', color: '#c0a472' }}>{t.listing_title}</span>
                    <StatusPill status={t.status} />
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* ── Tab: Purchases ── */}
        {tab === 'purchases' && (
          <section>
            <h2 className="sr-only">My Purchases</h2>
            {purchases.length === 0
              ? <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <p style={{ color: '#8a7359', marginBottom: '0.5rem' }}>No purchases yet.</p>
                  <Link href="/listings" style={{ color: '#f79a32', fontSize: '0.8rem' }}>Browse the marketplace →</Link>
                </div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {purchases.map(t => (
                    <article key={t.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <h3 style={{ fontSize: '0.875rem' }}>{t.listing_title}</h3>
                        <StatusPill status={t.status} />
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.725rem', color: '#8a7359', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                        <span>₦{Number(t.amount).toLocaleString()}</span>
                        <span>Seller: <Link href={`/seller/${t.seller_username}`} style={{ color: '#f79a32' }}>{t.seller_username}</Link></span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>

                      {/* Escrow state */}
                      {t.status === 'escrow' && (
                        <div style={{ padding: '0.65rem 0.75rem', background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.2)', borderRadius: '8px', marginBottom: '0.6rem' }}>
                          <p style={{ fontSize: '0.775rem', color: '#39adb5', marginBottom: '0.25rem' }}>
                            🔒 Payment confirmed — funds in escrow. Auto-releases in: <EscrowCountdown expiresAt={t.expires_at} />
                          </p>
                          <p style={{ fontSize: '0.68rem', color: '#5c4228' }}>
                            You can confirm receipt early or open a dispute if there's a problem.
                          </p>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {t.status === 'escrow' && (
                          <>
                            <button onClick={() => confirmReceipt(t.id)} className="btn btn-sm"
                              style={{ background: 'rgba(136,155,74,0.12)', color: '#a0b85e', border: '1px solid rgba(136,155,74,0.3)' }}>
                              ✓ Confirm Receipt Early
                            </button>
                            <button onClick={() => setDisputeFor(disputeFor === t.id ? null : t.id)} className="btn btn-sm"
                              style={{ background: 'rgba(220,61,34,0.08)', color: '#f2704a', border: '1px solid rgba(220,61,34,0.2)' }}>
                              ⚖️ Open Dispute
                            </button>
                          </>
                        )}
                        {t.status === 'released' && (
                          <>
                            {!t.review && (
                              <button onClick={() => setReviewFor(reviewFor === t.id ? null : t.id)} className="btn btn-sm"
                                style={{ background: 'rgba(247,154,50,0.1)', color: '#f79a32', border: '1px solid rgba(247,154,50,0.25)' }}>
                                ⭐ Rate Seller
                              </button>
                            )}
                            {t.review && <span style={{ fontSize: '0.72rem', color: '#a0b85e' }}>⭐ Rated {t.review.rating}/5</span>}
                            <Link href={`/seller/${t.seller_username}`} className="btn btn-sm"
                              style={{ background: 'rgba(57,173,181,0.08)', color: '#39adb5', border: '1px solid rgba(57,173,181,0.2)' }}>
                              👤 View Seller
                            </Link>
                            <button onClick={() => setDisputeFor(disputeFor === t.id ? null : t.id)} className="btn btn-sm"
                              style={{ background: 'rgba(220,61,34,0.07)', color: '#f2704a', border: '1px solid rgba(220,61,34,0.18)' }}>
                              ⚖️ Dispute
                            </button>
                          </>
                        )}
                        {t.status === 'disputed' && (
                          <span style={{ fontSize: '0.75rem', color: '#dc3d22' }}>⚖️ Dispute in progress — admin reviewing.</span>
                        )}
                      </div>

                      {reviewFor  === t.id && <ReviewForm  transactionId={t.id} onDone={() => { setReviewFor(null);  setPurchases(prev => prev.map(p => p.id === t.id ? { ...p, review: { rating: 5 } } : p)); }} />}
                      {disputeFor === t.id && <DisputeForm transactionId={t.id} onDone={() => { setDisputeFor(null); setPurchases(prev => prev.map(p => p.id === t.id ? { ...p, status: 'disputed' } : p)); }} />}
                    </article>
                  ))}
                </div>
              )
            }
          </section>
        )}

        {/* ── Tab: Find Sellers ── */}
        {tab === 'sellers' && (
          <section>
            <h2 className="sr-only">Find Sellers</h2>

            {/* Search box */}
            <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.8rem', color: '#8a7359', marginBottom: '0.75rem' }}>
                Search by <strong style={{ color: '#c0a472' }}>seller name</strong> or <strong style={{ color: '#c0a472' }}>product type</strong> — e.g. &quot;forex signals&quot;, &quot;crypto&quot;, or a username.
              </p>

              {/* Text + button row */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <input
                  id="seller-search-input"
                  value={sellerQuery}
                  onChange={e => setSellerQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchSellers()}
                  placeholder="e.g. forex, crypto signals, a seller's username…"
                  style={{ flex: 1 }}
                />
                <button
                  id="seller-search-btn"
                  onClick={() => searchSellers()}
                  disabled={searching || (!sellerQuery.trim() && sellerCategory === 'All')}
                  className="btn btn-primary btn-sm"
                  style={{ opacity: (searching || (!sellerQuery.trim() && sellerCategory === 'All')) ? 0.5 : 1 }}
                >
                  {searching ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><span className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} /> Searching</span> : '🔍 Search'}
                </button>
              </div>

              {/* Category filter pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {['All', ...CATEGORIES].map(cat => (
                  <button
                    key={cat}
                    onClick={() => { setSellerCategory(cat); searchSellers(sellerQuery, cat); }}
                    style={{
                      padding: '0.22rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem',
                      fontWeight: sellerCategory === cat ? 700 : 500, cursor: 'pointer',
                      border: `1px solid ${sellerCategory === cat ? 'rgba(247,154,50,0.4)' : 'rgba(75,52,34,0.5)'}`,
                      background: sellerCategory === cat ? 'rgba(247,154,50,0.12)' : 'transparent',
                      color: sellerCategory === cat ? '#f79a32' : '#8a7359',
                      transition: 'all 0.12s ease',
                    }}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            {sellerResults.length > 0 && (
              <>
                <p style={{ fontSize: '0.72rem', color: '#5c4228', marginBottom: '0.75rem' }}>
                  {sellerResults.length} seller{sellerResults.length !== 1 ? 's' : ''} found
                  {sellerQuery.trim() ? ` matching "${sellerQuery}"` : ''}
                  {sellerCategory !== 'All' ? ` in ${sellerCategory}` : ''}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '0.75rem' }}>
                  {sellerResults.map(s => (
                    <div key={s.username} className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      {/* Avatar + name */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                        <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg,#f79a32,#dc3d22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                          {s.username[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d3af86', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.username}</p>
                          <p style={{ fontSize: '0.68rem', color: '#5c4228' }}>{s.listingCount} listing{s.listingCount !== 1 ? 's' : ''} · {s.totalSales} sales</p>
                        </div>
                      </div>

                      {/* Category tags */}
                      {s.categories.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                          {s.categories.slice(0, 3).map((c: string) => (
                            <span key={c} style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', borderRadius: '999px', background: 'rgba(57,173,181,0.1)', border: '1px solid rgba(57,173,181,0.2)', color: '#39adb5' }}>
                              {c}
                            </span>
                          ))}
                          {s.categories.length > 3 && <span style={{ fontSize: '0.65rem', color: '#5c4228' }}>+{s.categories.length - 3} more</span>}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: 'auto' }}>
                        <Link href={`/seller/${s.username}`}
                          style={{ flex: 1, padding: '0.35rem 0.6rem', borderRadius: '7px', background: 'rgba(247,154,50,0.08)', border: '1px solid rgba(247,154,50,0.2)', color: '#f79a32', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          👤 Profile
                        </Link>
                        <Link href={`/chat?with=${s.username}`}
                          style={{ flex: 1, padding: '0.35rem 0.6rem', borderRadius: '7px', background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.2)', color: '#39adb5', fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                          💬 Message
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* No results state */}
            {sellerResults.length === 0 && hasSearched && !searching && (
              <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</p>
                <p style={{ color: '#8a7359', fontSize: '0.875rem', marginBottom: '0.4rem' }}>No sellers found {sellerQuery.trim() ? `for "${sellerQuery}"` : ''}{sellerCategory !== 'All' ? ` in ${sellerCategory}` : ''}.</p>
                <p style={{ fontSize: '0.775rem', color: '#5c4228' }}>Try a different keyword or category, or <Link href="/listings" style={{ color: '#f79a32' }}>browse the full marketplace</Link>.</p>
              </div>
            )}

            {/* Idle hint */}
            {!hasSearched && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(247,154,50,0.05)', border: '1px solid rgba(247,154,50,0.12)', borderRadius: '8px', fontSize: '0.775rem', color: '#8a7359' }}>
                💡 <strong style={{ color: '#c0a472' }}>Tip:</strong> Type a seller&apos;s username, a product keyword (e.g. &quot;forex signals&quot;, &quot;dropshipping&quot;), or pick a category above to find matching sellers and message them directly.
              </div>
            )}
          </section>
        )}

      </div>
    </main>
  );
}
