'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { apiService } from '@/utils/api';

interface Listing {
  id: string; title: string; preview_content: string; price: number;
  seller_username: string; seller_reputation: number;
  category_name: string; purchase_count: number;
}

const FEATURES = [
  {
    icon: '🔐', slug: 'encryption', title: 'End-to-End Encrypted',
    desc: 'AES-256 encryption runs in your browser. The server never touches plaintext — ever.',
  },
  {
    icon: '🛡️', slug: 'escrow', title: 'Escrow Protection',
    desc: 'Funds are held in escrow until you confirm receipt. 72-hour dispute window guaranteed.',
  },
  {
    icon: '👤', slug: 'anonymous', title: 'Fully Anonymous',
    desc: 'AI-generated usernames. Cryptographic keypairs. Zero real-identity data collected.',
  },
  {
    icon: '⭐', slug: 'reputation', title: 'Reputation System',
    desc: 'Weighted scores and staking keep sellers honest. Quality is enforced by incentive.',
  },
  {
    icon: '💬', slug: 'e2ee-chat', title: 'E2EE Chat',
    desc: 'RSA-encrypted WebSocket messages. The server only ever relays ciphertext.',
  },
  {
    icon: '🎯', slug: 'bounty-board', title: 'Bounty Board',
    desc: 'Post a problem with a reward. Sellers compete to deliver the best encrypted solution.',
  },
  {
    icon: '✅', slug: 'verification', title: 'Seller Verification',
    desc: 'Multi-layer proof review — sellers upload redacted evidence before going live. Scam-proof by design.',
  },
];

const STATS = [
  { label: 'Active Listings',      value: '2,400+' },
  { label: 'Transactions Done',    value: '18,000+' },
  { label: 'Platform Uptime',      value: '99.9%' },
  { label: 'Dispute Rate',         value: '< 2%' },
];

export default function HomePage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);

  /* ── Redirect authenticated users to their role destination ── */
  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) return;
    if (user?.is_staff)              router.replace('/admin/dashboard');
    else if (user?.user_type === 'seller') router.replace('/dashboard');
    else                             router.replace('/listings');
  }, [isLoading, isAuthenticated, user]);

  useEffect(() => {
    apiService.getListings({ featured: 'true', page: 1 } as any)
      .then(r => setFeaturedListings((r.data.results || r.data).slice(0, 3)))
      .catch(() => {});
  }, []);

  /* ── While auth is resolving show a spinner to avoid homepage flash ── */
  if (isLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '22px', height: '22px', borderWidth: '2px' }} />
    </main>
  );

  /* ── Authenticated: return null while router.replace() works ── */
  if (isAuthenticated) return null;

  return (
    <main style={{ minHeight: '100vh', overflow: 'hidden' }}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="hero-heading"
        style={{ position: 'relative', padding: '5rem 0 3.5rem' }}
      >
        {/* Ambient glows */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 60% 50% at 20% 40%, rgba(247,154,50,0.07) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 50% 40% at 80% 70%, rgba(220,61,34,0.06) 0%, transparent 70%)',
        }} />

        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div className="split-layout-7-3">

            {/* Left — content */}
            <div>
              {/* Status badge */}
              <div
                role="status"
                aria-live="polite"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: 'rgba(44,31,18,0.88)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(75,52,34,0.6)',
                  borderRadius: '999px', padding: '0.3rem 0.9rem',
                  fontSize: '0.75rem', color: '#c0a472',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#889b4a,#a0b858)',
                  animation: 'pulse-glow 2.5s ease-in-out infinite',
                }} />
                <span style={{ fontWeight: 600 }}>Fully encrypted · Anonymous by design</span>
              </div>

              {/* Heading */}
              <h1 id="hero-heading" style={{ marginBottom: '0.875rem' }}>
                <span className="text-gradient">Anonymous</span>{' '}
                <span>Information</span>{' '}
                <span className="text-gradient">Marketplace</span>
              </h1>

              {/* Subtitle */}
              <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, marginBottom: '1.5rem', maxWidth: '520px', color: '#c0a472' }}>
                Buy and sell verified earning strategies with complete privacy.{' '}
                <span className="text-gradient" style={{ fontWeight: 600 }}>Content encrypted end-to-end</span>,
                payments escrowed, trust enforced by reputation and staking.
              </p>

              {/* CTA buttons */}
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }} role="group" aria-label="Primary actions">
                <Link href="/listings" id="browse-listings-btn" className="btn btn-primary btn-lg">
                  Browse Marketplace →
                </Link>
                {!isAuthenticated && (
                  <Link href="/register" className="btn btn-secondary btn-lg">
                    Create Account
                  </Link>
                )}
                <Link href="/bounties" className="btn btn-secondary btn-lg">
                  View Bounties
                </Link>
              </div>
            </div>

            {/* Right — stats */}
            <div className="grid-container grid-2" role="list" aria-label="Platform statistics">
              {STATS.map(s => (
                <div key={s.label} className="card" role="listitem" style={{ textAlign: 'center', padding: '1rem 0.75rem' }}>
                  <div className="text-gradient" style={{ fontSize: '1.375rem', fontWeight: 800, marginBottom: '0.25rem' }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#8a7359', fontWeight: 500 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────── */}
      <section
        aria-labelledby="features-heading"
        style={{
          padding: '3.5rem 0',
          borderTop: '1px solid rgba(75,52,34,0.4)',
          background: 'rgba(44,31,18,0.3)',
        }}
      >
        <div className="container">
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 id="features-heading" style={{ marginBottom: '0.4rem' }}>
              Built for <span className="text-gradient">privacy-first</span> trading
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#8a7359', maxWidth: '480px' }}>
              Every feature is designed so neither the platform nor third parties can see what you trade.
            </p>
          </div>

          <div className="grid-container grid-3" role="list" aria-label="Platform features">
            {FEATURES.map(f => (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                role="listitem"
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <div className="card" style={{
                  height: '100%', cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }} aria-hidden="true">{f.icon}</div>
                  <h3 style={{ marginBottom: '0.4rem', fontSize: '0.9375rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.8125rem', color: '#8a7359', lineHeight: 1.6 }}>{f.desc}</p>
                  <div style={{
                    marginTop: '0.875rem', fontSize: '0.75rem',
                    color: '#f79a32', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                  }}>
                    Learn more →
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View all features link */}
          <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
            <Link href="/features" className="btn btn-ghost btn-sm">
              View all platform features →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Featured Listings ─────────────────────────────────────── */}
      {featuredListings.length > 0 && (
        <section
          aria-labelledby="featured-heading"
          style={{ padding: '3.5rem 0', borderTop: '1px solid rgba(75,52,34,0.4)' }}
        >
          <div className="container">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h2 id="featured-heading">Featured Listings</h2>
              <Link href="/listings" className="btn btn-secondary btn-sm">View all →</Link>
            </div>

            <div className="grid-container grid-3" role="list" aria-label="Featured listings">
              {featuredListings.map(l => (
                <Link key={l.id} href={`/listing/${l.id}`} role="listitem" style={{ textDecoration: 'none', display: 'block' }}>
                  <div className="card" style={{ height: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span className="badge badge-orange">{l.category_name}</span>
                      <span style={{ fontSize: '0.7rem', color: '#8a7359' }}>{l.purchase_count} sold</span>
                    </div>
                    <h3 className="line-clamp-2" style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>{l.title}</h3>
                    <p className="line-clamp-2" style={{ fontSize: '0.8rem', color: '#8a7359', marginBottom: '0.875rem' }}>
                      {l.preview_content}
                    </p>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      paddingTop: '0.75rem', borderTop: '1px solid rgba(75,52,34,0.4)',
                    }}>
                      <span className="text-gradient" style={{ fontSize: '1rem', fontWeight: 800 }}>
                        ₦{Number(l.price).toLocaleString()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#8a7359' }}>
                        ⭐ {l.seller_reputation?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section
        aria-labelledby="cta-heading"
        style={{
          padding: '3.5rem 0',
          borderTop: '1px solid rgba(75,52,34,0.4)',
          background: 'rgba(44,31,18,0.25)',
        }}
      >
        <div className="container">
          <div className="split-layout-3-7">
            {/* CTA card */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <h2 id="cta-heading" style={{ marginBottom: '0.5rem' }}>
                Ready to trade <span className="text-gradient">anonymously</span>?
              </h2>
              <p style={{ fontSize: '0.875rem', marginBottom: '1.25rem', color: '#8a7359' }}>
                Join the marketplace where privacy isn't a feature — it's the foundation.
              </p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }} role="group" aria-label="Get started">
                <Link href="/register" className="btn btn-primary btn-lg">Get Started Free</Link>
                <Link href="/listings" className="btn btn-secondary btn-lg">Browse First</Link>
              </div>
            </div>

            {/* Info card */}
            <div className="card" style={{ padding: '1.75rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚀</div>
              <h3 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>Join 2,400+ Traders</h3>
              <p style={{ fontSize: '0.8125rem', color: '#8a7359' }}>
                Start your anonymous trading journey today
              </p>
              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {['No real name required', 'Keys generated in browser', '72-hr dispute window'].map(txt => (
                  <div key={txt} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.775rem', color: '#c0a472' }}>
                    <span style={{ color: '#889b4a' }}>✓</span>
                    {txt}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
