'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Listing {
  id: string;
  title: string;
  description: string;
  preview_content: string;
  encrypted_content_url: string;
  price: number;
  seller_username: string;
  seller_reputation: number;
  seller_public_key: string;
  category_name: string;
  tags_list: string[];
  view_count: number;
  purchase_count: number;
  created_at: string;
}

function StarRating({ score }: { score: number }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <svg key={i} style={{ width: '14px', height: '14px', color: i <= Math.round(score) ? '#f79a32' : '#3c2818' }} fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span style={{ color: '#8a7359', fontSize: '0.8rem', marginLeft: '0.25rem' }}>{score.toFixed(1)}</span>
    </span>
  );
}

function MessageSellerButton({ sellerUsername }: { sellerUsername: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const openChat = async () => {
    setLoading(true);
    setError('');
    try {
      const userRes = await apiService.getChatUserByUsername(sellerUsername);
      const { id: participantId } = userRes.data;
      await apiService.createChatRoom({ participant_id: participantId, room_type: 'direct' });
      router.push(`/chat?with=${sellerUsername}`);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not open chat.');
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '0.6rem' }}>
      <button
        id="message-seller-btn"
        onClick={openChat}
        disabled={loading}
        style={{
          width: '100%', padding: '0.65rem', borderRadius: '10px', fontWeight: 600,
          fontSize: '0.875rem', cursor: 'pointer', border: '1px solid rgba(57,173,181,0.35)',
          background: 'rgba(57,173,181,0.08)', color: '#39adb5',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
          opacity: loading ? 0.6 : 1, transition: 'all 0.15s ease',
        }}
      >
        {loading ? <><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Opening chat…</> : '💬 Message Seller'}
      </button>
      {error && <p style={{ fontSize: '0.72rem', color: '#f2704a', marginTop: '0.3rem', textAlign: 'center' }}>{error}</p>}
    </div>
  );
}


function PurchaseModal({ listing, onClose }: { listing: Listing; onClose: () => void }) {
  const { user } = useAuth();
  type Step = 'method' | 'mpesa_phone' | 'processing' | 'done_paystack' | 'done_mpesa' | 'error';
  const [step, setStep]     = useState<Step>('method');
  const [method, setMethod] = useState<'paystack' | 'mpesa'>('paystack');
  const [phone, setPhone]   = useState('');
  const [payUrl, setPayUrl] = useState('');
  const [mpesaMsg, setMpesaMsg] = useState('');
  const [err, setErr]       = useState('');

  const fee   = Math.round(Number(listing.price) * 0.15);
  const total = Number(listing.price) + fee;

  const initiatePaystack = async () => {
    setStep('processing');
    try {
      const buyerPublicKey = localStorage.getItem(`pk_${user?.id}`) || '';
      const res = await apiService.initiateTransaction({ listing_id: listing.id, buyer_public_key: buyerPublicKey });
      setPayUrl(res.data.authorization_url);
      setStep('done_paystack');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'Payment failed. Try again.');
      setStep('error');
    }
  };

  const initiateMpesa = async () => {
    if (!phone.trim()) return;
    setStep('processing');
    try {
      const res = await apiService.initiateMpesa({ listing_id: listing.id, phone: phone.trim() });
      setMpesaMsg(res.data.message || 'Check your phone to complete the M-Pesa payment.');
      setStep('done_mpesa');
    } catch (e: any) {
      setErr(e.response?.data?.error || 'M-Pesa initiation failed. Try again.');
      setStep('error');
    }
  };

  const modalBg: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 50, padding: '1rem',
  };
  const card: React.CSSProperties = {
    background: '#1a1208', border: '1px solid #3c2818', borderRadius: '16px',
    padding: '1.5rem', width: '100%', maxWidth: '420px',
  };
  const methodBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.75rem', borderRadius: '10px', cursor: 'pointer',
    border: active ? '2px solid #f79a32' : '1px solid #3c2818',
    background: active ? 'rgba(247,154,50,0.08)' : '#221a0f',
    color: active ? '#f79a32' : '#8a7359', fontWeight: 700,
    fontSize: '0.875rem', transition: 'all 0.2s',
  });

  return (
    <div style={modalBg} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={card}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d3af86' }}>Secure Purchase</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a7359', fontSize: '1.25rem' }}>✕</button>
        </div>

        {/* Summary strip */}
        <div style={{ background: '#221a0f', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: '#8a7359', marginBottom: '0.25rem' }}>Purchasing</p>
          <p style={{ fontWeight: 700, color: '#d3af86', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{listing.title}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: '#8a7359' }}>
            <span>Base price</span><span>₦{Number(listing.price).toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.775rem', color: '#8a7359' }}>
            <span>Platform fee (15%)</span><span>₦{fee.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 800, color: '#f79a32', marginTop: '0.4rem', borderTop: '1px solid #3c2818', paddingTop: '0.4rem' }}>
            <span>Total</span><span>₦{total.toLocaleString()}</span>
          </div>
        </div>

        {/* ── Method select ── */}
        {step === 'method' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#8a7359', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Choose payment method
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={methodBtn(method === 'paystack')} onClick={() => setMethod('paystack')}>
                💳 Paystack<br /><span style={{ fontSize: '0.7rem', fontWeight: 400 }}>Card · Bank · USSD</span>
              </button>
              <button style={methodBtn(method === 'mpesa')} onClick={() => setMethod('mpesa')}>
                📱 M-Pesa<br /><span style={{ fontSize: '0.7rem', fontWeight: 400 }}>Safaricom STK Push</span>
              </button>
            </div>

            <div style={{ background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.18)', borderRadius: '8px', padding: '0.65rem 0.875rem', fontSize: '0.775rem', color: '#39adb5' }}>
              🔐 Funds held in escrow. Content delivered encrypted after payment. 72-hr dispute window.
            </div>

            <button
              id="proceed-payment-btn"
              onClick={() => method === 'mpesa' ? setStep('mpesa_phone') : initiatePaystack()}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', background: 'linear-gradient(135deg,#f79a32,#dc3d22)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', border: 'none', cursor: 'pointer' }}
            >
              {method === 'mpesa' ? 'Enter M-Pesa number →' : 'Proceed to Paystack →'}
            </button>
          </div>
        )}

        {/* ── M-Pesa phone entry ── */}
        {step === 'mpesa_phone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: '#8a7359', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              M-Pesa Phone Number
            </p>
            <p style={{ fontSize: '0.8rem', color: '#c0a472' }}>
              Enter your Safaricom number. You&apos;ll receive a payment prompt on your phone.
            </p>
            <input
              id="mpesa-phone-input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. 0712345678 or 254712345678"
              style={{ width: '100%', padding: '0.65rem 0.875rem', borderRadius: '8px', background: '#221a0f', border: '1px solid #4b3422', color: '#d3af86', fontSize: '0.9rem' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setStep('method')} style={{ flex: 1, padding: '0.65rem', borderRadius: '8px', background: '#3c2818', border: '1px solid #4b3422', color: '#c0a472', cursor: 'pointer', fontSize: '0.85rem' }}>
                ← Back
              </button>
              <button
                id="mpesa-pay-btn"
                onClick={initiateMpesa}
                disabled={!phone.trim()}
                style={{ flex: 2, padding: '0.65rem', borderRadius: '8px', background: 'linear-gradient(135deg,#00c853,#00875a)', color: '#fff', fontWeight: 700, border: 'none', cursor: phone.trim() ? 'pointer' : 'default', opacity: phone.trim() ? 1 : 0.5, fontSize: '0.875rem' }}
              >
                📱 Pay via M-Pesa
              </button>
            </div>
          </div>
        )}

        {/* ── Processing ── */}
        {step === 'processing' && (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <span className="spinner" style={{ width: '36px', height: '36px', borderWidth: '3px', display: 'inline-block', marginBottom: '1rem' }} />
            <p style={{ color: '#8a7359', fontSize: '0.875rem' }}>
              {method === 'mpesa' ? 'Sending M-Pesa prompt…' : 'Initializing payment…'}
            </p>
          </div>
        )}

        {/* ── Paystack done ── */}
        {step === 'done_paystack' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(136,155,74,0.15)', border: '1px solid rgba(136,155,74,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', fontSize: '1.5rem' }}>✓</div>
            <p style={{ fontWeight: 700, color: '#d3af86' }}>Payment link ready!</p>
            <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>Complete payment on Paystack. Return here after — your content will be unlocked.</p>
            <a href={payUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: 'block', width: '100%', padding: '0.75rem', borderRadius: '10px', background: '#0ba4db', color: '#fff', fontWeight: 700, textDecoration: 'none', textAlign: 'center' }}>
              Pay on Paystack →
            </a>
          </div>
        )}

        {/* ── M-Pesa done ── */}
        {step === 'done_mpesa' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '2.5rem' }}>📱</div>
            <p style={{ fontWeight: 700, color: '#d3af86' }}>Check your phone!</p>
            <p style={{ fontSize: '0.825rem', color: '#8a7359' }}>{mpesaMsg}</p>
            <div style={{ background: 'rgba(0,200,83,0.07)', border: '1px solid rgba(0,200,83,0.2)', borderRadius: '8px', padding: '0.75rem', fontSize: '0.775rem', color: '#00c853' }}>
              Enter your M-Pesa PIN when prompted. Transaction will be held in escrow automatically.
            </div>
            <button onClick={onClose} style={{ padding: '0.65rem', borderRadius: '10px', background: '#3c2818', border: '1px solid #4b3422', color: '#c0a472', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
              Done — monitor in Dashboard
            </button>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ fontSize: '2rem' }}>⚠️</div>
            <p style={{ color: '#f2704a', fontSize: '0.875rem' }}>{err}</p>
            <button onClick={() => setStep('method')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f79a32', fontWeight: 600, fontSize: '0.875rem' }}>
              ← Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ListingDetailPage() {
  const { id } = useParams() as { id: string };
  const { isAuthenticated, user, isLoading } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?next=/listing/${id}`);
      return;
    }
    if (isAuthenticated && !fetchedRef.current) {
      fetchedRef.current = true;
      apiService.getListing(id)
        .then(res => { setListing(res.data); setLoading(false); })
        .catch(() => router.push('/listings'));
    }
  }, [id, isLoading, isAuthenticated]);

  if (isLoading || (loading && isAuthenticated)) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
    </main>
  );

  if (!isAuthenticated) return null;
  if (!listing) return null;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 0 4rem' }}>
      {showModal && <PurchaseModal listing={listing} onClose={() => setShowModal(false)} />}
      <div className="container" style={{ maxWidth: '1050px' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#5c4228', marginBottom: '1.75rem' }}>
          <Link href="/listings" style={{ color: '#8a7359', textDecoration: 'none' }}>← Marketplace</Link>
          <span style={{ color: '#3c2818' }}>/</span>
          <span style={{ color: '#c0a472', fontWeight: 500 }}>{listing.title}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem', alignItems: 'flex-start' }}>

          {/* ── Main Column ────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Header Card */}
            <div className="card" style={{ padding: '1.75rem' }}>
              {/* Category + Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#39adb5', background: 'rgba(57,173,181,0.1)', padding: '0.2rem 0.6rem', borderRadius: '999px', fontWeight: 600, border: '1px solid rgba(57,173,181,0.2)' }}>
                  {listing.category_name || 'General'}
                </span>
                <span style={{ fontSize: '0.7rem', color: '#5c4228' }}>·</span>
                <span style={{ fontSize: '0.7rem', color: '#5c4228' }}>{fmtDate(listing.created_at)}</span>
              </div>

              {/* Title */}
              <h1 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#d3af86', margin: '0 0 0.85rem', lineHeight: 1.3 }}>
                {listing.title}
              </h1>

              {/* Seller info bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem', padding: '0.6rem 0.8rem', background: 'rgba(34,26,15,0.8)', borderRadius: '10px', border: '1px solid rgba(75,52,34,0.3)' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg,#f79a32,#dc3d22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                  {listing.seller_username[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <Link href={`/seller/${listing.seller_username}`} style={{ fontSize: '0.85rem', fontWeight: 600, color: '#d3af86', textDecoration: 'none' }}>
                    {listing.seller_username}
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.1rem' }}>
                    <StarRating score={listing.seller_reputation} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#8a7359' }}>
                  <span>👁 {listing.view_count} views</span>
                  <span>🛒 {listing.purchase_count} sold</span>
                </div>
              </div>

              {/* Tags */}
              {listing.tags_list?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '1.25rem' }}>
                  {listing.tags_list.map(t => (
                    <span key={t} style={{ fontSize: '0.68rem', background: 'rgba(75,52,34,0.4)', color: '#8a7359', padding: '0.15rem 0.5rem', borderRadius: '999px', border: '1px solid rgba(75,52,34,0.3)' }}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Description */}
              <div style={{ borderTop: '1px solid rgba(75,52,34,0.3)', paddingTop: '1rem' }}>
                <h3 style={{ fontSize: '0.78rem', fontWeight: 700, color: '#5c4228', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Description</h3>
                <p style={{ color: '#c0a472', lineHeight: 1.75, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{listing.description}</p>
              </div>
            </div>

            {/* Preview Card */}
            <div className="card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <svg style={{ width: '16px', height: '16px', color: '#39adb5' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#d3af86', margin: 0 }}>Preview</h3>
              </div>
              <p style={{ color: '#c0a472', lineHeight: 1.75, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>{listing.preview_content}</p>

              <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: 'rgba(57,173,181,0.06)', borderRadius: '10px', border: '1px solid rgba(57,173,181,0.15)', textAlign: 'center' }}>
                <p style={{ fontSize: '0.75rem', color: '#39adb5', margin: 0 }}>🔒 Full content is encrypted and only revealed after purchase</p>
              </div>
            </div>
          </div>

          {/* ── Sidebar ────────────────────────────────────────── */}
          <div style={{ position: 'sticky', top: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Price Card */}
            <div className="card" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.15rem' }}>
                <span className="text-gradient">₦{Number(listing.price).toLocaleString()}</span>
              </p>
              <p style={{ fontSize: '0.72rem', color: '#5c4228', marginBottom: '1.25rem' }}>+ 15% platform fee · Escrow protected</p>

              {/* Role-aware purchase button */}
              {user?.user_type === 'buyer' ? (
                <button
                  id="purchase-btn"
                  onClick={() => setShowModal(true)}
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', fontSize: '0.95rem', padding: '0.8rem' }}
                >
                  🛒 Purchase Now
                </button>
              ) : (
                <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(136,155,74,0.08)', border: '1px solid rgba(136,155,74,0.2)', textAlign: 'center' }}>
                  <p style={{ fontSize: '0.775rem', color: '#a0b85e', margin: 0 }}>
                    🛠️ You are viewing as a <strong>Seller</strong>.<br />
                    <span style={{ color: '#8a7359' }}>Only buyer accounts can purchase listings.</span>
                  </p>
                </div>
              )}

              {/* Message Seller */}
              {listing.seller_username !== user?.username && (
                <MessageSellerButton sellerUsername={listing.seller_username} />
              )}
            </div>

            {/* Trust Signals Card */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5c4228', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.85rem' }}>Security Guarantees</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {[
                  { icon: '🛡️', label: 'Escrow-protected payment', color: '#a0b85e' },
                  { icon: '🔐', label: 'End-to-end encrypted', color: '#39adb5' },
                  { icon: '⏰', label: '72h dispute window', color: '#f79a32' },
                  { icon: '⚖️', label: 'Admin-arbitrated disputes', color: '#8ab1b0' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem', color: '#c0a472' }}>
                    <span style={{ fontSize: '0.95rem', width: '20px', textAlign: 'center' }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Views', value: listing.view_count, icon: '👁' },
                  { label: 'Sold', value: listing.purchase_count, icon: '🛒' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '0.5rem', background: 'rgba(34,26,15,0.6)', borderRadius: '8px' }}>
                    <div style={{ fontSize: '1rem', marginBottom: '0.15rem' }}>{s.icon}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f79a32' }}>{s.value}</div>
                    <div style={{ fontSize: '0.68rem', color: '#5c4228' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
