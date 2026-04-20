'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

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

/* ── Helpers ─────────────────────────────────────────────── */
const TX_STATUS: Record<string, { bg: string; color: string }> = {
  pending:  { bg: 'rgba(247,154,50,0.1)',  color: '#f79a32' },
  escrow:   { bg: 'rgba(57,173,181,0.1)',  color: '#39adb5' },
  released: { bg: 'rgba(136,155,74,0.1)',  color: '#889b4a' },
  disputed: { bg: 'rgba(220,61,34,0.1)',   color: '#dc3d22' },
  refunded: { bg: 'rgba(138,115,89,0.1)',  color: '#8a7359' },
  draft:    { bg: 'rgba(92,66,40,0.15)',   color: '#8a7359' },
  active:   { bg: 'rgba(136,155,74,0.12)', color: '#a0b85e' },
};

function StatusPill({ status }: { status: string }) {
  const s = TX_STATUS[status] || { bg: 'rgba(75,52,34,0.3)', color: '#8a7359' };
  return <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.18rem 0.6rem', borderRadius: '999px', background: s.bg, color: s.color }}>{status}</span>;
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
      if (diff <= 0) { setRemaining('Releasing now…'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setRemaining(`${h}h ${m}m`);
    };
    update();
    const t = setInterval(update, 60000);
    return () => clearInterval(t);
  }, [expiresAt]);
  return <span style={{ color: '#f79a32', fontWeight: 600 }}>{remaining}</span>;
}

/* ── Seller Dashboard ──────────────────────────────────── */
export default function SellerDashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [tab, setTab]               = useState<'overview' | 'listings' | 'sales'>('overview');
  const [stats, setStats]           = useState<any>(null);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [sales, setSales]           = useState<Transaction[]>([]);
  const [loading, setLoading]       = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

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
  }, [isAuthenticated]);

  const deleteListing = async (id: string) => {
    setDeletingId(id);
    try {
      await apiService.client.delete(`/listings/${id}/`);
      setMyListings(prev => prev.filter(l => l.id !== id));
      setConfirmDelete(null);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete listing.');
    } finally {
      setDeletingId(null);
    }
  };

  const escrowSales = sales.filter(s => s.status === 'escrow');
  const totalRevenue = sales.filter(s => s.status === 'released').reduce((s, t) => s + Number(t.amount), 0);

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '36px', height: '36px' }} />
    </div>
  );

  const TABS = [
    { id: 'overview' as const,  label: '🏠 Overview' },
    { id: 'listings' as const,  label: `📦 My Listings (${myListings.length})` },
    { id: 'sales'    as const,  label: `💰 Sales (${sales.length})` },
  ];

  return (
    <main style={{ minHeight: '100vh' }}>
      <div className="container" style={{ paddingTop: '2rem', paddingBottom: '3rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: '1.375rem', marginBottom: '0.2rem' }}>Seller Dashboard</h1>
            <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>
              Welcome back, <span style={{ color: '#f79a32', fontWeight: 600 }}>{user?.username}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link href="/chat" className="btn btn-secondary btn-sm">💬 Messages</Link>
            <Link href="/dashboard/create" id="create-listing-btn" className="btn btn-primary btn-sm">+ New Listing</Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
            <StatCard label="Active Listings" value={myListings.filter(l => l.status === 'active').length} icon="📦" color="#f79a32" />
            <StatCard label="Total Sales"     value={sales.filter(s => s.status === 'released').length}    icon="✅" color="#a0b85e" />
            <StatCard label="Revenue (Net)"   value={`₦${(totalRevenue * 0.85).toLocaleString()}`}        icon="💵" color="#39adb5" />
            <StatCard label="Reputation"      value={`${Number(stats.reputation_score || 0).toFixed(1)} ⭐`} icon="🏆" color="#f79a32" />
            <style>{`@media(max-width:640px){section{grid-template-columns:repeat(2,1fr)!important}}`}</style>
          </section>
        )}

        {/* Escrow alert */}
        {escrowSales.length > 0 && (
          <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(57,173,181,0.08)', border: '1px solid rgba(57,173,181,0.25)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#39adb5' }}>
              ⏳ <strong>{escrowSales.length}</strong> sale(s) in escrow. Funds auto-wire to you after the 12-hour window.
            </span>
            <button onClick={() => setTab('sales')} className="btn btn-ghost btn-sm">View Sales →</button>
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
                <Link href="/dashboard/create" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>+ Create New Listing</Link>
                <button onClick={() => setTab('listings')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>📦 Manage Listings</button>
                <Link href="/chat" className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>💬 Messages</Link>
                <button onClick={() => setTab('sales')} className="btn btn-secondary btn-sm" style={{ justifyContent: 'flex-start' }}>💰 View Sales</button>
              </div>
            </div>
            <div className="card" style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem' }}>Performance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {[
                  ['Avg Rating', `${Number(stats?.reputation_score || 0).toFixed(1)} ⭐`],
                  ['In Escrow',  `${escrowSales.length} sale(s)`],
                  ['Pending Revenue', `₦${escrowSales.reduce((s, t) => s + Number(t.amount) * 0.85, 0).toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', borderBottom: '1px solid #3c2818', paddingBottom: '0.35rem' }}>
                    <span style={{ color: '#8a7359' }}>{k}</span>
                    <span style={{ color: '#d3af86', fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: My Listings ── */}
        {tab === 'listings' && (
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem' }}>Your Listings</h2>
              <Link href="/dashboard/create" className="btn btn-primary btn-sm">+ New Listing</Link>
            </div>

            {myListings.length === 0
              ? <div className="card" style={{ textAlign: 'center', padding: '2.5rem' }}>
                  <p style={{ color: '#8a7359', marginBottom: '0.5rem' }}>No listings yet.</p>
                  <Link href="/dashboard/create" style={{ color: '#f79a32', fontSize: '0.8rem' }}>Create your first listing →</Link>
                </div>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {myListings.map(l => (
                    <article key={l.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                      {/* Delete confirmation overlay */}
                      {confirmDelete === l.id ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <p style={{ fontSize: '0.8rem', color: '#f2704a', fontWeight: 600 }}>⚠️ Delete "{l.title}"?</p>
                          <p style={{ fontSize: '0.75rem', color: '#8a7359' }}>This action cannot be undone. Any pending sales will be affected.</p>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={() => deleteListing(l.id)} disabled={deletingId === l.id}
                              style={{ padding: '0.35rem 0.875rem', borderRadius: '7px', background: 'rgba(220,61,34,0.15)', border: '1px solid rgba(220,61,34,0.35)', color: '#f2704a', fontSize: '0.775rem', cursor: 'pointer', opacity: deletingId === l.id ? 0.6 : 1 }}>
                              {deletingId === l.id ? 'Deleting…' : 'Yes, Delete'}
                            </button>
                            <button onClick={() => setConfirmDelete(null)} className="btn btn-ghost btn-sm">Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <h3 style={{ fontSize: '0.875rem', marginBottom: '0.2rem' }}>{l.title}</h3>
                            <p style={{ fontSize: '0.725rem', color: '#8a7359' }}>
                              ₦{Number(l.price).toLocaleString()} · {l.view_count} views · {l.purchase_count} sold
                              {l.category_name && ` · ${l.category_name}`}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <StatusPill status={l.status} />
                            <Link href={`/listing/${l.id}`} style={{ fontSize: '0.72rem', color: '#39adb5' }}>Preview</Link>
                            <Link href={`/dashboard/edit/${l.id}`} style={{ fontSize: '0.72rem', color: '#f79a32' }}>✏️ Edit</Link>
                            <button onClick={() => setConfirmDelete(l.id)}
                              style={{ background: 'none', border: 'none', fontSize: '0.72rem', color: '#5c4228', cursor: 'pointer', padding: 0 }}>
                              🗑 Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )
            }
          </section>
        )}

        {/* ── Tab: Sales ── */}
        {tab === 'sales' && (
          <section>
            <h2 className="sr-only">Your Sales</h2>
            {sales.length === 0
              ? <p style={{ color: '#8a7359', fontSize: '0.875rem' }}>No sales yet. Create a listing to get started.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {sales.map(t => (
                    <article key={t.id} className="card" style={{ padding: '1rem 1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <h3 style={{ fontSize: '0.875rem' }}>{t.listing_title}</h3>
                        <StatusPill status={t.status} />
                      </div>
                      <div style={{ fontSize: '0.725rem', color: '#8a7359', marginBottom: '0.5rem' }}>
                        ₦{Number(t.amount).toLocaleString()} · buyer: {t.buyer_username} · {new Date(t.created_at).toLocaleDateString()}
                      </div>

                      {t.status === 'escrow' && (
                        <div style={{ padding: '0.6rem 0.75rem', background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.2)', borderRadius: '8px' }}>
                          <p style={{ fontSize: '0.775rem', color: '#39adb5', marginBottom: '0.1rem' }}>
                            🔒 Funds in escrow — auto-wire to you in: <EscrowCountdown expiresAt={t.expires_at} />
                          </p>
                          <p style={{ fontSize: '0.68rem', color: '#5c4228' }}>
                            You will receive ₦{(Number(t.amount) * 0.85).toLocaleString()} (after 15% platform fee) once escrow releases.
                          </p>
                        </div>
                      )}

                      {t.status === 'released' && (
                        <div style={{ padding: '0.5rem 0.75rem', background: 'rgba(136,155,74,0.07)', border: '1px solid rgba(136,155,74,0.2)', borderRadius: '8px', fontSize: '0.775rem', color: '#a0b85e' }}>
                          ✅ Funds released — ₦{(Number(t.amount) * 0.85).toLocaleString()} wired to your wallet.
                          {t.review && <span style={{ marginLeft: '0.75rem', color: '#f79a32' }}>⭐ {t.review.rating}/5</span>}
                        </div>
                      )}

                      {t.status === 'disputed' && (
                        <p style={{ fontSize: '0.75rem', color: '#dc3d22' }}>⚖️ Dispute in progress — admin reviewing. Funds held until resolved.</p>
                      )}
                    </article>
                  ))}
                </div>
              )
            }
          </section>
        )}

      </div>
    </main>
  );
}
