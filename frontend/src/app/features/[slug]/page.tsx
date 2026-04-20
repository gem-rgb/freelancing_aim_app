'use client';

import Link from 'next/link';
import { use } from 'react';
import { notFound } from 'next/navigation';

const FEATURES: Record<string, {
  icon: string; title: string; tagline: string;
  description: string; points: string[];
  related: { label: string; href: string }[];
  demoLabel?: string; demoHref?: string;
}> = {
  encryption: {
    icon: '🔐',
    title: 'End-to-End Encrypted',
    tagline: 'Your content is sealed before it leaves your device',
    description: `AIM uses AES-256-GCM symmetric encryption to protect listing content, and RSA-2048 asymmetric encryption to securely exchange the decryption key between buyer and seller. All cryptographic operations happen entirely in your browser — the AIM server receives only sealed ciphertext and never touches plaintext at any point in the transaction lifecycle.`,
    points: [
      'AES-256-GCM content encryption in browser before upload',
      'RSA-2048 keypair generated locally — private key is never transmitted',
      'Content key is encrypted with the buyer\'s public key before release',
      'Server stores only ciphertext and encrypted keys — zero-knowledge design',
      'TLS-over-HTTPS transport adds a second encryption layer in transit',
    ],
    related: [
      { label: 'Escrow Protection', href: '/features/escrow' },
      { label: 'E2EE Chat',         href: '/features/e2ee-chat' },
      { label: 'Fully Anonymous',   href: '/features/anonymous' },
    ],
    demoLabel: 'Create a Listing', demoHref: '/dashboard/create',
  },
  escrow: {
    icon: '🛡️',
    title: 'Escrow Protection',
    tagline: 'Funds locked until you confirm delivery — no exceptions',
    description: `When a buyer initiates a purchase, their payment is moved into a cryptographic escrow hold via Paystack. The seller's content key is NOT released until the buyer explicitly confirms receipt, or the 72-hour dispute window expires in the seller's favour. AIM acts as a neutral trustee — neither side can cheat the process.`,
    points: [
      'Funds held via Paystack — never held by AIM directly',
      '72-hour dispute window after content key is released',
      'Seller stakes reputation to list — creating financial skin-in-the-game',
      'Admin-arbitrated disputes with evidence from both parties',
      'Automatic refund on failed or cancelled transactions',
    ],
    related: [
      { label: 'Reputation System',  href: '/features/reputation' },
      { label: 'Browse Marketplace', href: '/listings' },
      { label: 'E2EE Encryption',    href: '/features/encryption' },
    ],
    demoLabel: 'Browse Listings', demoHref: '/listings',
  },
  anonymous: {
    icon: '👤',
    title: 'Fully Anonymous',
    tagline: 'Your real identity is never collected, stored or required',
    description: `AIM requires no email address, phone number, or government ID to sign up. On registration, an AI-generated pseudonym is assigned to your account. Combined with your locally-generated RSA keypair, your cryptographic identity is provably separate from your real-world identity. Even the AIM team cannot correlate your account to a person.`,
    points: [
      'AI-generated usernames — no personal-info patterns',
      'No email, phone, or real-name required at any stage',
      'RSA keypair created in your browser — server only stores the public key',
      'Transaction records reference pseudonyms only',
      'Optional TOR/VPN use for network-level anonymity',
    ],
    related: [
      { label: 'E2EE Encryption', href: '/features/encryption' },
      { label: 'E2EE Chat',       href: '/features/e2ee-chat' },
      { label: 'Create Account',  href: '/register' },
    ],
    demoLabel: 'Get Started Free', demoHref: '/register',
  },
  reputation: {
    icon: '⭐',
    title: 'Reputation System',
    tagline: 'Trust is earned, scored — and can be staked',
    description: `Seller reputation on AIM is a weighted score calculated from verified completed transactions and buyer ratings. Sellers can optionally stake tokens to boost listing visibility, but staked amounts are slashed on dispute losses. This aligns financial incentive with quality delivery — dishonest sellers lose money, not just stars.`,
    points: [
      'Weighted reputation score from verified completed transactions',
      'Buyers rate sellers 1–5 after every successful release',
      'Reputation staking: higher stake = higher listing prominence',
      'Stake is reduced on dispute loss — real financial consequence for fraud',
      'Minimum reputation threshold enforced for high-value listings',
    ],
    related: [
      { label: 'Escrow Protection',  href: '/features/escrow' },
      { label: 'Browse Marketplace', href: '/listings' },
      { label: 'Bounty Board',       href: '/features/bounty-board' },
    ],
    demoLabel: 'View Marketplace', demoHref: '/listings',
  },
  'e2ee-chat': {
    icon: '💬',
    title: 'E2EE Chat',
    tagline: 'RSA-encrypted negotiation — server sees only noise',
    description: `AIM's built-in messaging system uses RSA-2048 public-key encryption so that every message is encrypted in the sender's browser using the recipient's public key before transmission. The WebSocket relay server receives and stores only ciphertext blobs — it is cryptographically incapable of reading your conversations.`,
    points: [
      'Every message encrypted client-side with recipient\'s RSA public key',
      'WebSocket server acts as a dumb relay — zero message plaintext stored',
      'Message history encrypted at rest in the database',
      'Recipients decrypt locally using their private key (never uploaded)',
      'No message metadata leaks — even timestamps are approximate',
    ],
    related: [
      { label: 'E2EE Encryption',   href: '/features/encryption' },
      { label: 'Fully Anonymous',   href: '/features/anonymous' },
      { label: 'Browse Marketplace',href: '/listings' },
    ],
    demoLabel: 'Open Chat', demoHref: '/chat',
  },
  'bounty-board': {
    icon: '🎯',
    title: 'Bounty Board',
    tagline: 'Post a problem. Get competing encrypted solutions.',
    description: `The AIM Bounty Board lets buyers post specific research or information requests with a reward attached. Sellers browse open bounties and submit encrypted solutions. The buyer reviews decrypted submissions and accepts the best one — triggering an escrow release. Competing sellers sharpen quality; buyers get exactly what they need.`,
    points: [
      'Post a bounty with a fixed reward and detailed requirements',
      'Sellers submit encrypted responses — buyer decrypts to review',
      'Multiple submissions accepted; buyer picks the best',
      'Escrow holds the reward until buyer confirms acceptance',
      'Priority levels (low → urgent) signal time-sensitivity to sellers',
    ],
    related: [
      { label: 'Escrow Protection', href: '/features/escrow' },
      { label: 'View Bounties',     href: '/bounties' },
      { label: 'Reputation System', href: '/features/reputation' },
    ],
    demoLabel: 'View Bounties', demoHref: '/bounties',
  },
  verification: {
    icon: '✅',
    title: 'Seller Verification',
    tagline: 'Proof of legitimacy before a single satoshi changes hands',
    description: `AIM's multi-layer verification system requires sellers to attach redacted, non-spoiler demo material before their listing goes live. A combination of automated scoring and staff review evaluates each piece of proof. Verified listings earn a trust badge and priority placement — unverified listings stay invisible. Reproducibility tests from real buyers further refine ongoing scores.`,
    points: [
      'Sellers upload redacted screenshots, logs, or receipts as proof',
      'Staff review approves or rejects demo material before public display',
      'Verification score calculated from proofs, reproducibility, and post-sale reports',
      'Listings enter a Verification Queue — only approved ones get trust badges',
      'Post-sale reports from real buyers continuously update the score',
    ],
    related: [
      { label: 'Reputation System',  href: '/features/reputation' },
      { label: 'Escrow Protection',  href: '/features/escrow' },
      { label: 'Create a Listing',   href: '/dashboard/create' },
    ],
    demoLabel: 'Create with Demo', demoHref: '/dashboard/create',
  },
};

export default function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const f = FEATURES[slug];
  if (!f) notFound();

  return (
    <main style={{ minHeight: '100vh', padding: '3rem 0' }}>
      <div className="container" style={{ maxWidth: '760px' }}>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#8a7359' }}>
          <Link href="/" style={{ color: '#8a7359' }}>Home</Link>
          <span>›</span>
          <Link href="/features" style={{ color: '#8a7359' }}>Features</Link>
          <span>›</span>
          <span style={{ color: '#d3af86' }}>{f.title}</span>
        </nav>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{f.icon}</div>
          <h1 style={{ marginBottom: '0.5rem' }}>
            <span className="text-gradient">{f.title}</span>
          </h1>
          <p style={{ fontSize: '1.05rem', color: '#c0a472', fontStyle: 'italic', lineHeight: 1.6 }}>{f.tagline}</p>
        </div>

        {/* Description */}
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.85, color: '#c0a472' }}>{f.description}</p>
        </div>

        {/* Key points */}
        <div className="card" style={{ marginBottom: '1.25rem', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '1rem' }}>How it works</h2>
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {f.points.map((pt, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.8375rem', color: '#c0a472', lineHeight: 1.6 }}>
                <span style={{ color: '#889b4a', fontWeight: 700, flexShrink: 0, marginTop: '0.1rem' }}>✓</span>
                {pt}
              </li>
            ))}
          </ul>
        </div>

        {/* Related */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.8rem', marginBottom: '0.75rem', color: '#5c4228', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Related
          </h2>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {f.related.map(r => (
              <Link key={r.href} href={r.href} className="btn btn-secondary btn-sm">{r.label}</Link>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <Link href="/features" className="btn btn-ghost btn-sm">← All Features</Link>
          <Link href="/" className="btn btn-ghost btn-sm">Home</Link>
          {f.demoHref && (
            <Link href={f.demoHref} className="btn btn-primary btn-sm">{f.demoLabel || 'Try it'} →</Link>
          )}
        </div>

      </div>
    </main>
  );
}
