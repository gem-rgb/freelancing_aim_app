'use client';

import Link from 'next/link';

const FEATURES = [
  {
    icon: '🔐',
    slug: 'encryption',
    title: 'End-to-End Encryption',
    tagline: 'AES-256-GCM in your browser. Server sees only ciphertext.',
    highlight: 'Zero-Knowledge',
    highlightColor: '#39adb5',
    detail: [
      'Your listing content is encrypted locally before any upload',
      'RSA-2048 keypair generated in your browser — private key never leaves',
      'Buyer receives the decryption key only after escrow release',
    ],
  },
  {
    icon: '🛡️',
    slug: 'escrow',
    title: 'Escrow Protection',
    tagline: 'Funds locked until delivery confirmed. No exceptions.',
    highlight: '72-hr Dispute Window',
    highlightColor: '#889b4a',
    detail: [
      'Payments held via Paystack — AIM never holds your money directly',
      'Content key released only on buyer confirmation or timeout',
      'Admin-arbitrated disputes with evidence from both parties',
    ],
  },
  {
    icon: '👤',
    slug: 'anonymous',
    title: 'Full Anonymity',
    tagline: 'No email. No phone. No real name. Ever.',
    highlight: 'No Identity Required',
    highlightColor: '#f79a32',
    detail: [
      'AI-generated usernames — no personal-info patterns',
      'RSA keypair acts as your cryptographic identity',
      'Even AIM cannot link your account to a real person',
    ],
  },
  {
    icon: '⭐',
    slug: 'reputation',
    title: 'Reputation & Staking',
    tagline: 'Trust earned through performance. Enforced by incentive.',
    highlight: 'Skin-in-the-Game',
    highlightColor: '#dc3d22',
    detail: [
      'Weighted score from verified completed transactions',
      'Stake tokens to boost your listing — lose them on dispute',
      'Buyers rate 1–5 after every release',
    ],
  },
  {
    icon: '💬',
    slug: 'e2ee-chat',
    title: 'E2EE Messaging',
    tagline: 'RSA-encrypted WebSocket chat. Server relays only noise.',
    highlight: 'Server-Blind Relay',
    highlightColor: '#5c8a5e',
    detail: [
      'Every message encrypted with the recipient\'s RSA public key',
      'Database stores only ciphertext — zero plaintext exposure',
      'Decrypt locally with your private key (never uploaded)',
    ],
  },
  {
    icon: '🎯',
    slug: 'bounty-board',
    title: 'Bounty Board',
    tagline: 'Post a problem. Get competing encrypted solutions.',
    highlight: 'Competitive Delivery',
    highlightColor: '#b87a32',
    detail: [
      'Attach a reward to a specific research or info request',
      'Sellers submit encrypted solutions — buyer decrypts to review',
      'Escrow holds reward until the best submission is accepted',
    ],
  },
  {
    icon: '✅',
    slug: 'verification',
    title: 'Seller Verification',
    tagline: 'Multi-layer proof review before any listing goes live.',
    highlight: 'Anti-Scam System',
    highlightColor: '#7a5cb8',
    detail: [
      'Sellers attach redacted screenshots, logs, and receipts as proof',
      'Staff review approves demo material before public display',
      'Ongoing verification score from reproducibility tests and buyer reports',
    ],
  },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '🎲', title: 'Generate Anonymous Identity', desc: 'Click "Gen" — an AI-generated username and RSA-2048 keypair are created in your browser. Zero personal data used.' },
  { step: '02', icon: '🔒', title: 'Encrypt Your Content', desc: 'Write your strategy or guide. AES-256-GCM seals it in your browser before upload. The server never sees the plaintext.' },
  { step: '03', icon: '🎯', title: 'Add Proof & Submit', desc: 'Upload redacted screenshots or log excerpts to prove legitimacy. Staff review approves your demo before it goes live.' },
  { step: '04', icon: '💸', title: 'Buyer Pays into Escrow', desc: 'When a buyer purchases, Paystack holds their funds. No money moves until delivery is confirmed.' },
  { step: '05', icon: '🗝️', title: 'Key Released on Confirmation', desc: 'You release the AES key encrypted with the buyer\'s public key. They decrypt locally. Escrow releases to you.' },
];

export default function FeaturesPage() {
  return (
    <main style={{ minHeight: '100vh' }}>

      {/* ── Hero ── */}
      <section style={{ padding: '4rem 0 3rem', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 60% 50% at 30% 50%, rgba(247,154,50,0.07) 0%, transparent 70%)' }} />
        <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '740px' }}>
          <nav aria-label="Breadcrumb" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#5c4228' }}>
            <Link href="/" style={{ color: '#8a7359' }}>Home</Link>
            <span>›</span>
            <span style={{ color: '#d3af86' }}>Features</span>
          </nav>
          <h1 style={{ marginBottom: '0.75rem' }}>
            Platform <span className="text-gradient">Features</span>
          </h1>
          <p style={{ fontSize: '0.9375rem', color: '#c0a472', lineHeight: 1.75, maxWidth: '580px', marginBottom: '1.5rem' }}>
            Every feature is designed around a single principle: <strong style={{ color: '#d3af86' }}>neither the platform, nor any third party, can see what you trade</strong>.
            Privacy isn't a setting — it's the architecture.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary">Get Started Free →</Link>
            <Link href="/listings" className="btn btn-secondary">Browse Marketplace</Link>
          </div>
        </div>
      </section>

      {/* ── Feature Cards Grid ── */}
      <section style={{ padding: '3rem 0', borderTop: '1px solid rgba(75,52,34,0.4)', background: 'rgba(44,31,18,0.25)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {FEATURES.map(f => (
              <Link
                key={f.slug}
                href={`/features/${f.slug}`}
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column' }}
              >
                <div className="card" style={{
                  flex: 1, padding: '1.5rem', cursor: 'pointer',
                  transition: 'all 0.22s ease', display: 'flex', flexDirection: 'column', gap: '0', height: '100%',
                }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
                    <div style={{ fontSize: '2rem' }}>{f.icon}</div>
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, padding: '0.2rem 0.6rem',
                      borderRadius: '999px', border: `1px solid ${f.highlightColor}40`,
                      background: `${f.highlightColor}10`, color: f.highlightColor,
                      whiteSpace: 'nowrap',
                    }}>
                      {f.highlight}
                    </span>
                  </div>

                  <h3 style={{ marginBottom: '0.3rem', fontSize: '0.9375rem' }}>{f.title}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#8a7359', lineHeight: 1.55, marginBottom: '1rem' }}>
                    {f.tagline}
                  </p>

                  {/* Detail points */}
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                    {f.detail.map((d, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.775rem', color: '#8a7359', lineHeight: 1.5 }}>
                        <span style={{ color: '#889b4a', flexShrink: 0, marginTop: '1px' }}>✓</span>
                        {d}
                      </li>
                    ))}
                  </ul>

                  <div style={{ marginTop: '1.125rem', fontSize: '0.75rem', color: '#f79a32', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Deep dive →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works Flow ── */}
      <section style={{ padding: '3.5rem 0', borderTop: '1px solid rgba(75,52,34,0.4)' }}>
        <div className="container">
          <div style={{ marginBottom: '2rem', maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '0.4rem' }}>
              How a trade <span className="text-gradient">actually works</span>
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#8a7359' }}>
              From signup to receiving your funds — every step is cryptographically enforced.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {HOW_IT_WORKS.map((h, i) => (
              <div key={h.step} style={{ display: 'flex', gap: '1.25rem', position: 'relative', paddingBottom: i < HOW_IT_WORKS.length - 1 ? '0' : '0' }}>
                {/* Line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div style={{ position: 'absolute', left: '1.375rem', top: '3rem', bottom: 0, width: '1px', background: 'rgba(75,52,34,0.5)' }} />
                )}
                {/* Number circle */}
                <div style={{ flexShrink: 0, width: '2.75rem', height: '2.75rem', borderRadius: '50%', background: 'linear-gradient(135deg,rgba(247,154,50,0.15),rgba(220,61,34,0.1))', border: '1px solid rgba(247,154,50,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.775rem', fontWeight: 800, color: '#f79a32', position: 'relative', zIndex: 1 }}>
                  {h.step}
                </div>
                {/* Content */}
                <div className="card" style={{ flex: 1, padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{h.icon}</span>
                    <h3 style={{ fontSize: '0.9rem', margin: 0 }}>{h.title}</h3>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#8a7359', lineHeight: 1.6 }}>{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security Architecture callout ── */}
      <section style={{ padding: '3rem 0', borderTop: '1px solid rgba(75,52,34,0.4)', background: 'rgba(44,31,18,0.2)' }}>
        <div className="container" style={{ maxWidth: '760px' }}>
          <div className="card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(247,154,50,0.05) 0%, rgba(57,173,181,0.05) 100%)', borderColor: 'rgba(247,154,50,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>🏛️</div>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <h2 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                  Security <span className="text-gradient">by Architecture</span>, Not Policy
                </h2>
                <p style={{ fontSize: '0.85rem', color: '#c0a472', lineHeight: 1.75, marginBottom: '1rem' }}>
                  Most platforms promise privacy through policy. AIM enforces it through mathematics. Even if compelled by a court order,
                  AIM cannot hand over what it does not have — your plaintext content, your private key, or your real identity are all outside the server's reach.
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
                  {[
                    { icon: '🔐', text: 'AES-256-GCM content encryption' },
                    { icon: '🗝️', text: 'RSA-2048 key exchange' },
                    { icon: '🌐', text: 'TLS transport layer' },
                    { icon: '📵', text: 'No email or phone required' },
                    { icon: '🧮', text: 'Zero-knowledge server design' },
                    { icon: '⚖️', text: 'Staking-enforced accountability' },
                  ].map(item => (
                    <div key={item.text} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', padding: '0.6rem', background: 'rgba(44,31,18,0.5)', borderRadius: '8px', border: '1px solid rgba(75,52,34,0.3)' }}>
                      <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                      <span style={{ fontSize: '0.725rem', color: '#c0a472', lineHeight: 1.4 }}>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: '3rem 0', borderTop: '1px solid rgba(75,52,34,0.4)' }}>
        <div className="container" style={{ maxWidth: '580px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>
            Ready to trade <span className="text-gradient">privately</span>?
          </h2>
          <p style={{ fontSize: '0.875rem', color: '#8a7359', marginBottom: '1.5rem' }}>
            No email. No ID. No exposure. Just cryptography and commerce.
          </p>
          <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/register" className="btn btn-primary btn-lg">Create Anonymous Account</Link>
            <Link href="/listings" className="btn btn-secondary btn-lg">Browse First</Link>
          </div>
        </div>
      </section>

    </main>
  );
}
