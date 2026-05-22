'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

const CATEGORIES = ['Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];
const STATUS_OPTIONS = [
  { value: 'draft',    label: 'Draft — hidden from marketplace' },
  { value: 'active',   label: 'Active — visible to buyers' },
  { value: 'archived', label: 'Archived — no longer for sale' },
];

const fLabel = (text: string, required = false) => (
  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>
    {text}{required && <span style={{ color: '#dc3d22', marginLeft: '2px' }}>*</span>}
  </label>
);

export default function EditListingPage() {
  const params  = useParams();
  const router  = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();
  const listingId = params?.id as string;

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');

  const [form, setForm] = useState({
    title: '', description: '', preview_content: '',
    price: '', category: '', tags: '', status: 'active',
  });

  /* Load existing listing */
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (!listingId) return;
    const fetch = async () => {
      try {
        const res = await apiService.client.get(`/listings/${listingId}/`);
        const l   = res.data;
        /* Ownership check */
        if (l.seller_username !== user?.username) {
          router.replace('/dashboard');
          return;
        }
        setForm({
          title:           l.title           || '',
          description:     l.description     || '',
          preview_content: l.preview_content || '',
          price:           String(l.price)   || '',
          category:        l.category_name   || '',
          tags:            l.tags            || '',
          status:          l.status          || 'active',
        });
      } catch (e: any) {
        setError('Could not load listing. It may not exist or you do not own it.');
      } finally { setLoading(false); }
    };
    if (!isLoading) fetch();
  }, [isLoading, isAuthenticated, listingId, user]);

  const hf = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const w100 = { width: '100%' } as React.CSSProperties;

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.price || !form.description.trim()) {
      setError('Title, description, and price are required.'); return;
    }
    setSubmitting(true); setError(''); setSuccess('');
    try {
      await apiService.client.patch(`/listings/${listingId}/`, {
        title:           form.title,
        description:     form.description,
        preview_content: form.preview_content,
        price:           parseFloat(form.price),
        category:        form.category || null,
        tags:            form.tags,
        status:          form.status,
      });
      setSuccess('Listing updated successfully!');
      setTimeout(() => router.push('/dashboard/seller'), 1500);
    } catch (e: any) {
      const d = e.response?.data;
      setError(d?.error || d?.detail || JSON.stringify(d) || 'Update failed.');
    } finally { setSubmitting(false); }
  };

  if (isLoading || loading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '24px', height: '24px', borderWidth: '2px' }} />
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 0 3rem' }}>
      <div className="container" style={{ maxWidth: '640px' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', gap: '0.4rem', fontSize: '0.775rem', color: '#8a7359', marginBottom: '1.25rem' }}>
          <Link href="/dashboard/seller" style={{ color: '#8a7359' }}>Dashboard</Link>
          <span>›</span>
          <Link href="/dashboard/seller" style={{ color: '#8a7359' }}>My Listings</Link>
          <span>›</span>
          <span style={{ color: '#d3af86' }}>Edit Listing</span>
        </nav>

        <h1 style={{ marginBottom: '0.3rem' }}>
          ✏️ <span className="text-gradient">Edit</span> Listing
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#8a7359', marginBottom: '1.5rem' }}>
          Update your listing details. Changes take effect immediately.
        </p>

        {error && (
          <div role="alert" style={{ marginBottom: '1rem', padding: '0.65rem 0.875rem', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', borderRadius: '7px', fontSize: '0.8rem', color: '#f2704a' }}>
            ⚠️ {error}
          </div>
        )}
        {success && (
          <div role="status" style={{ marginBottom: '1rem', padding: '0.65rem 0.875rem', background: 'rgba(136,155,74,0.1)', border: '1px solid rgba(136,155,74,0.25)', borderRadius: '7px', fontSize: '0.8rem', color: '#a0b85e' }}>
            ✅ {success}
          </div>
        )}

        <div className="card" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>

          <div>
            {fLabel('Title', true)}
            <input value={form.title} onChange={e => hf('title', e.target.value)}
              placeholder="What are you selling?" style={w100} />
          </div>

          <div>
            {fLabel('Description', true)}
            <textarea value={form.description} onChange={e => hf('description', e.target.value)}
              rows={4} placeholder="Describe the value buyers receive…"
              style={{ ...w100, resize: 'vertical' }} />
          </div>

          <div>
            {fLabel('Preview Teaser (shown publicly)', true)}
            <textarea value={form.preview_content} onChange={e => hf('preview_content', e.target.value)}
              rows={3} placeholder="A compelling teaser that entices buyers without giving away your method…"
              style={{ ...w100, resize: 'vertical' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              {fLabel('Price (₦)', true)}
              <input type="number" min="100" value={form.price}
                onChange={e => hf('price', e.target.value)} placeholder="5000" style={w100} />
              {form.price && (
                <p style={{ fontSize: '0.68rem', color: '#5c4228', marginTop: '0.3rem' }}>
                  You receive ≈ ₦{(parseFloat(form.price || '0') * 0.85).toLocaleString()} after 15% fee
                </p>
              )}
            </div>
            <div>
              {fLabel('Category')}
              <select value={form.category} onChange={e => hf('category', e.target.value)} style={w100}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            {fLabel('Tags (comma-separated)')}
            <input value={form.tags} onChange={e => hf('tags', e.target.value)}
              placeholder="forex, swing-trading, passive-income" style={w100} />
          </div>

          <div>
            {fLabel('Listing Status')}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {STATUS_OPTIONS.map(opt => (
                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="status"
                    value={opt.value}
                    checked={form.status === opt.value}
                    onChange={() => hf('status', opt.value)}
                    style={{ accentColor: '#f79a32', width: '15px', height: '15px' }}
                  />
                  <span style={{ fontSize: '0.8rem', color: form.status === opt.value ? '#d3af86' : '#8a7359' }}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', paddingTop: '0.25rem' }}>
            <Link href="/dashboard/seller" className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </Link>
            <button onClick={handleSubmit} disabled={submitting} className="btn btn-primary"
              style={{ flex: 2, justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
              {submitting
                ? <><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Saving…</>
                : '💾 Save Changes'}
            </button>
          </div>

        </div>

        {/* Danger zone */}
        <div style={{ marginTop: '1.5rem', padding: '1rem 1.25rem', background: 'rgba(220,61,34,0.05)', border: '1px solid rgba(220,61,34,0.15)', borderRadius: '9px' }}>
          <p style={{ fontSize: '0.775rem', fontWeight: 600, color: '#f2704a', marginBottom: '0.35rem' }}>⚠️ Danger Zone</p>
          <p style={{ fontSize: '0.73rem', color: '#8a7359', marginBottom: '0.6rem' }}>
            To delete this listing, go back to your dashboard and use the delete button on the listing card.
          </p>
          <Link href="/dashboard/seller" style={{ fontSize: '0.73rem', color: '#5c4228' }}>
            ← Back to My Listings
          </Link>
        </div>

      </div>
    </main>
  );
}
