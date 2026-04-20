'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { EncryptionService } from '@/utils/encryption';
import { useAuth } from '@/contexts/AuthContext';

/* ─── constants ─────────────────────────────────────────────────── */
const CATEGORIES = ['Forex', 'Crypto', 'E-commerce', 'Freelancing', 'Affiliate', 'Real Estate', 'Other'];

const DEMO_CATEGORIES = [
  { value: 'fullz',       label: 'Fullz / Data Dumps',        icon: '🪪' },
  { value: 'proxies',     label: 'Proxies & Anonymity',        icon: '🌐' },
  { value: 'bypass',      label: 'Account Bypass',             icon: '🔓' },
  { value: 'bank',        label: 'Bank / Payment Withdrawals', icon: '💳' },
  { value: 'freelancing', label: 'Freelancing Sites',          icon: '💻' },
  { value: 'general',     label: 'General',                    icon: '📦' },
];

const CATEGORY_HINTS: Record<string, { title: string; tips: string[] }> = {
  fullz:       { title: 'Fullz / Data Dumps', tips: ['Show a REDACTED sample record format with key fields visible but values masked.', 'Include a partial count screenshot.', 'Attach a blurred preview of verification.'] },
  proxies:     { title: 'Proxies & Anonymity', tips: ['Paste a sample list of 3–5 censored IPs.', 'Upload a censored ping/speed test screenshot.', 'Show a partial anon-check screenshot.'] },
  bypass:      { title: 'Account Bypass', tips: ['Upload a partial flow screenshot — show the starting point, censor the final inside view.', 'Provide a redacted working credential snippet.', 'Show before/after screenshots — blur any sensitive info.'] },
  bank:        { title: 'Bank / Payment Withdrawals', tips: ['Upload a censored receipt (mask account numbers, leave amount visible).', 'Show a partial balance screenshot.', 'Include a step-count of the withdrawal method.'] },
  freelancing: { title: 'Freelancing Sites', tips: ['Screenshot earnings dashboard (amount visible, username/payment blurred).', 'Show your profile rating / completion rate (censor username).', 'Paste a redacted client message confirming payment.'] },
  general:     { title: 'General Guide', tips: ['Include a short, redacted excerpt showing quality without giving away the method.', 'Add a screenshot of any result — blur identifying info.', 'Provide a partial step list (steps 1-2 of 5).'] },
};

/* ─── media type config ─────────────────────────────────────────── */
const MEDIA_TYPES = [
  { value: 'image',    icon: '🖼️',  label: 'Image',    accept: 'image/*',    ext: 'JPG, PNG, GIF, WebP', maxMb: 20 },
  { value: 'video',    icon: '🎥',  label: 'Video',    accept: 'video/*',    ext: 'MP4, MOV, WebM',       maxMb: 200 },
  { value: 'document', icon: '📄',  label: 'Document', accept: '.pdf,.doc,.docx,.txt,.xlsx,.csv', ext: 'PDF, DOC, TXT, CSV', maxMb: 50 },
  { value: 'audio',    icon: '🎵',  label: 'Audio',    accept: 'audio/*',    ext: 'MP3, WAV, OGG',        maxMb: 50 },
];

/* ─── types ─────────────────────────────────────────────────────── */
type Step = 1 | 2 | 3 | 4;
interface DemoFile { url: string; type: string; caption: string; file_hash: string; }
interface PreviewMediaItem {
  id: string;
  localUrl: string;    // object URL for preview
  file_url: string;    // after upload succeeds
  media_type: string;
  filename: string;
  file_size: number;
  mime_type: string;
  caption: string;
  uploading: boolean;
  progress: number;    // 0-100
  error: string;
}

/* ─── helpers ───────────────────────────────────────────────────── */
const fLabel = (text: string, required = false) => (
  <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>
    {text}{required && <span style={{ color: '#dc3d22', marginLeft: '2px' }}>*</span>}
  </label>
);

const infoBox = (msg: string, color = '#39adb5', bg = 'rgba(57,173,181,0.07)', border = 'rgba(57,173,181,0.2)') => (
  <div style={{ padding: '0.65rem 0.875rem', background: bg, border: `1px solid ${border}`, borderRadius: '7px', fontSize: '0.8rem', color }}>
    {msg}
  </div>
);

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function mediaIcon(type: string) {
  const m = MEDIA_TYPES.find(t => t.value === type);
  return m?.icon ?? '📎';
}

/* ─── component ─────────────────────────────────────────────────── */
export default function CreateListingPage() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace('/login?next=/dashboard/create');
  }, [isLoading, isAuthenticated]);

  if (isLoading || !isAuthenticated) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />
    </main>
  );

  if (user?.user_type === 'buyer') return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ maxWidth: '440px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛠️</div>
        <h1 style={{ fontSize: '1.375rem', marginBottom: '0.5rem' }}>Seller Account <span className="text-gradient">Required</span></h1>
        <p style={{ fontSize: '0.875rem', color: '#8a7359', lineHeight: 1.7, marginBottom: '1.5rem' }}>
          Your current account is a <strong style={{ color: '#39adb5' }}>Buyer</strong>.
          Create a dedicated Seller account to list.
        </p>
        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'center' }}>
          <Link href="/register?role=seller" className="btn btn-primary">Create Seller Account →</Link>
          <Link href="/listings" className="btn btn-secondary">Browse Marketplace</Link>
        </div>
      </div>
    </main>
  );

  /* ── State ── */
  const [step, setStep]   = useState<Step>(1);
  const [error, setError] = useState('');

  // Step 1
  const [form, setForm] = useState({
    title: '', description: '', preview_content: '',
    price: '', category: '', tags: '',
  });

  // Preview media (Step 1 section)
  const [previewMedia, setPreviewMedia] = useState<PreviewMediaItem[]>([]);
  const [activeMediaTab, setActiveMediaTab] = useState<string>('image');
  const [pendingListingId, setPendingListingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 2
  const [contentPlain,  setContentPlain]  = useState('');
  const [encryptedBlob, setEncryptedBlob] = useState<string | null>(null);
  const [aesKey,        setAesKey]        = useState('');

  // Step 3
  const [demoCategory,  setDemoCategory]  = useState('general');
  const [demoText,      setDemoText]      = useState('');
  const [demoFiles,     setDemoFiles]     = useState<DemoFile[]>([]);
  const [guidance,      setGuidance]      = useState(false);
  const [demoFileInput, setDemoFileInput] = useState({ url: '', type: 'screenshot', caption: '' });

  // Step 4
  const [submitting, setSubmitting] = useState(false);

  const w100 = { width: '100%' } as React.CSSProperties;
  const hf   = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  /* ── Media upload helpers ── */
  const acceptForTab = MEDIA_TYPES.find(t => t.value === activeMediaTab)?.accept ?? '*/*';

  const uploadFile = useCallback(async (file: File, listingId: string) => {
    const mediaType = MEDIA_TYPES.find(t => file.type.startsWith(t.value === 'document' ? 'application' : t.value))?.value
      ?? (file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : file.type.startsWith('audio') ? 'audio' : 'document');

    const itemId = Math.random().toString(36).slice(2);
    const localUrl = URL.createObjectURL(file);

    const newItem: PreviewMediaItem = {
      id: itemId, localUrl, file_url: '', media_type: activeMediaTab,
      filename: file.name, file_size: file.size, mime_type: file.type,
      caption: '', uploading: true, progress: 0, error: '',
    };
    setPreviewMedia(prev => [...prev, newItem]);

    try {
      // 1. Get presigned URL
      const urlRes = await apiService.client.post(`/listings/${listingId}/preview-media/upload-url/`, {
        filename:     file.name,
        content_type: file.type || 'application/octet-stream',
        file_size:    file.size,
        media_type:   activeMediaTab,
      });
      const { upload_url, file_url } = urlRes.data;

      // 2. Upload directly to MinIO
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setPreviewMedia(prev => prev.map(m => m.id === itemId ? { ...m, progress: pct } : m));
          }
        };
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.open('PUT', upload_url);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
      });

      // 3. Register media record in DB
      await apiService.client.post(`/listings/${listingId}/preview-media/`, {
        media_type: activeMediaTab, file_url, filename: file.name,
        file_size: file.size, mime_type: file.type, caption: '',
      });

      setPreviewMedia(prev => prev.map(m =>
        m.id === itemId ? { ...m, uploading: false, progress: 100, file_url } : m
      ));
    } catch (err: any) {
      setPreviewMedia(prev => prev.map(m =>
        m.id === itemId ? { ...m, uploading: false, error: err.message || 'Upload failed' } : m
      ));
    }
  }, [activeMediaTab]);

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (previewMedia.length + files.length > 10) {
      setError('Maximum 10 preview media files allowed.'); return;
    }

    // Create listing draft first if not yet done
    let listingId = pendingListingId;
    if (!listingId) {
      if (!form.title || !form.price) {
        setError('Enter title and price first, then add media.'); return;
      }
      try {
        const res = await apiService.createListing({
          title: form.title, description: form.description || 'Draft',
          preview_content: form.preview_content || 'Draft',
          price: parseFloat(form.price), category: form.category, tags: form.tags,
        });
        listingId = res.data.id;
        setPendingListingId(listingId);
      } catch (e: any) {
        setError(e.response?.data?.error || 'Could not create draft. Check title and price.');
        return;
      }
    }

    setError('');
    for (const file of Array.from(files)) {
      const maxMb = MEDIA_TYPES.find(t => t.value === activeMediaTab)?.maxMb ?? 50;
      if (file.size > maxMb * 1024 * 1024) {
        setError(`${file.name} exceeds ${maxMb} MB limit for ${activeMediaTab}.`);
        continue;
      }
      await uploadFile(file, listingId!);
    }
  }, [previewMedia.length, pendingListingId, form, activeMediaTab, uploadFile]);

  const removeMedia = async (item: PreviewMediaItem) => {
    if (pendingListingId && item.file_url) {
      try {
        await apiService.client.delete(`/listings/${pendingListingId}/preview-media/${item.id}/`);
      } catch { /* silently ignore — file may not exist in DB yet */ }
    }
    URL.revokeObjectURL(item.localUrl);
    setPreviewMedia(prev => prev.filter(m => m.id !== item.id));
  };

  const updateCaption = (id: string, caption: string) => {
    setPreviewMedia(prev => prev.map(m => m.id === id ? { ...m, caption } : m));
  };

  /* ── Steps ── */
  const encryptContent = () => {
    if (!contentPlain.trim()) { setError('Enter your full content before encrypting.'); return; }
    const key = EncryptionService.generateAESKey();
    const { encrypted, iv } = EncryptionService.encryptAES(contentPlain, key);
    setEncryptedBlob(JSON.stringify({ encrypted, iv }));
    setAesKey(key);
    setError(''); setStep(3);
  };

  const addDemoFile = () => {
    if (!demoFileInput.url.trim()) { setError('Enter a valid URL for the demo file.'); return; }
    if (demoFiles.length >= 5) { setError('Maximum 5 demo files allowed.'); return; }
    setDemoFiles(p => [...p, { ...demoFileInput, file_hash: '' }]);
    setDemoFileInput({ url: '', type: 'screenshot', caption: '' });
    setError('');
  };
  const removeDemoFile = (i: number) => setDemoFiles(p => p.filter((_, idx) => idx !== i));

  const validateDemo = () => {
    if (!demoText.trim() && demoFiles.length === 0) {
      setError('Add at least a demo text excerpt or one demo file.'); return;
    }
    if (!guidance) { setError('Please acknowledge the redaction & no-spoiler guidelines.'); return; }
    setError(''); setStep(4);
  };

  const submitListing = async () => {
    setSubmitting(true); setError('');
    try {
      let listingId = pendingListingId;

      if (!listingId) {
        const createRes = await apiService.createListing({
          title: form.title, description: form.description,
          preview_content: form.preview_content, price: parseFloat(form.price),
          category: form.category, tags: form.tags,
        });
        listingId = createRes.data.id;
      } else {
        // Update the draft with final values
        await apiService.client.patch(`/listings/${listingId}/`, {
          title: form.title, description: form.description,
          preview_content: form.preview_content, price: parseFloat(form.price),
          category: form.category, tags: form.tags,
        });
      }

      // Upload encrypted content
      const blobBytes = new Blob([encryptedBlob!]).size;
      const hash      = EncryptionService.generateHash(encryptedBlob!);
      const urlRes    = await apiService.getUploadUrl(listingId!, {
        filename: 'content.enc', content_type: 'application/octet-stream',
        file_size: blobBytes, content_hash: hash,
      });
      await fetch(urlRes.data.upload_url, {
        method: 'PUT', body: encryptedBlob!,
        headers: { 'Content-Type': 'application/octet-stream' },
      });

      const userId = JSON.parse(localStorage.getItem('user') || '{}')?.id;
      if (userId) localStorage.setItem(`aes_key_${listingId}`, aesKey);

      if (demoText.trim() || demoFiles.length > 0) {
        await apiService.submitDemo({
          listing: listingId!, demo_category: demoCategory,
          demo_text: demoText, demo_files: demoFiles, guidance_acknowledged: guidance,
        });
      }

      router.push('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.error || e.response?.data?.detail || e.message || 'Failed to create listing.');
    } finally { setSubmitting(false); }
  };

  const STEPS = ['Details & Preview', 'Content & Encrypt', 'Demonstration', 'Review & Publish'];
  const hint  = CATEGORY_HINTS[demoCategory] || CATEGORY_HINTS.general;
  const uploadingCount = previewMedia.filter(m => m.uploading).length;

  /* ── UI ── */
  return (
    <main style={{ minHeight: '100vh', padding: '2rem 0 3rem' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#8a7359', marginBottom: '1.25rem' }}>
          <Link href="/dashboard" style={{ color: '#8a7359' }}>Dashboard</Link>
          <span>›</span><span style={{ color: '#d3af86' }}>Create Listing</span>
        </nav>

        <h1 style={{ marginBottom: '0.3rem' }}><span className="text-gradient">Create</span> a Listing</h1>
        <p style={{ fontSize: '0.8rem', color: '#8a7359', marginBottom: '1.5rem' }}>
          Your content is encrypted in your browser before upload — the platform never sees plaintext.
        </p>

        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.4rem' }}>
          {[1,2,3,4].map(s => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '999px', transition: 'all 0.3s', background: s <= step ? 'linear-gradient(90deg,#f79a32,#dc3d22)' : '#3c2818' }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#5c4228', marginBottom: '1.5rem' }}>
          {STEPS.map((lbl, i) => (
            <span key={lbl} style={{ color: step >= i + 1 ? '#f79a32' : '#5c4228' }}>{lbl}</span>
          ))}
        </div>

        {error && (
          <div role="alert" style={{ marginBottom: '1rem', padding: '0.65rem 0.875rem', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', borderRadius: '7px', fontSize: '0.8rem', color: '#f2704a' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ══ STEP 1 ════════════════════════════════════════════════════ */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

            {/* Core fields card */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                {fLabel('Title', true)}
                <input id="listing-title" value={form.title} onChange={e => hf('title', e.target.value)}
                  placeholder="What are you selling?" style={w100} />
              </div>
              <div>
                {fLabel('Description', true)}
                <textarea value={form.description} onChange={e => hf('description', e.target.value)}
                  rows={4} placeholder="Describe the value buyers receive (no spoilers)…"
                  style={{ ...w100, resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  {fLabel('Price (₦)', true)}
                  <input id="listing-price" type="number" min="100" value={form.price}
                    onChange={e => hf('price', e.target.value)} placeholder="5000" style={w100} />
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
            </div>

            {/* ── Preview Teaser (rich media uploader) ── */}
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', marginBottom: '0.2rem' }}>
                  🎬 Preview Teaser <span style={{ fontSize: '0.75rem', color: '#5c4228', fontWeight: 400 }}>— shown publicly to attract buyers</span>
                </h3>
                {infoBox('Upload images, videos, documents or audio alongside a written teaser. Buyers see this before purchasing. Keep it compelling but don\'t reveal the full method.')}
              </div>

              {/* Written description */}
              <div>
                {fLabel('Written Teaser Description', true)}
                <textarea value={form.preview_content} onChange={e => hf('preview_content', e.target.value)}
                  rows={3} placeholder="A compelling teaser that entices buyers without giving away your method…"
                  style={{ ...w100, resize: 'none' }} />
              </div>

              {/* Media type tabs */}
              <div>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {MEDIA_TYPES.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setActiveMediaTab(t.value)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.4rem 0.75rem', borderRadius: '8px', cursor: 'pointer',
                        fontSize: '0.775rem', fontWeight: 600,
                        border: `1px solid ${activeMediaTab === t.value ? '#f79a32' : '#4b3422'}`,
                        background: activeMediaTab === t.value ? 'rgba(247,154,50,0.1)' : '#3c2818',
                        color: activeMediaTab === t.value ? '#f79a32' : '#8a7359',
                        transition: 'all 0.18s ease',
                      }}
                    >
                      {t.icon} {t.label}
                      <span style={{ fontSize: '0.65rem', color: '#5c4228', marginLeft: '2px' }}>up to {t.maxMb}MB</span>
                    </button>
                  ))}
                </div>

                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleFileSelect(e.dataTransfer.files); }}
                  style={{
                    border: '2px dashed #4b3422', borderRadius: '10px', padding: '1.5rem',
                    textAlign: 'center', cursor: 'pointer', background: 'rgba(60,40,24,0.3)',
                    transition: 'border-color 0.2s',
                  }}
                >
                  <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
                    {MEDIA_TYPES.find(t => t.value === activeMediaTab)?.icon ?? '📎'}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#c0a472', fontWeight: 600, marginBottom: '0.2rem' }}>
                    Drop {activeMediaTab} files here or click to browse
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#5c4228' }}>
                    {MEDIA_TYPES.find(t => t.value === activeMediaTab)?.ext} · max {MEDIA_TYPES.find(t => t.value === activeMediaTab)?.maxMb}MB · up to 10 files total
                  </p>
                  {(!form.title || !form.price) && (
                    <p style={{ fontSize: '0.72rem', color: '#f79a32', marginTop: '0.4rem' }}>
                      ↑ Fill in Title and Price above first to enable upload
                    </p>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptForTab}
                  multiple
                  style={{ display: 'none' }}
                  onChange={e => handleFileSelect(e.target.files)}
                />
              </div>

              {/* Uploaded media list */}
              {previewMedia.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: '#8a7359', fontWeight: 600 }}>
                      Uploaded Preview Media ({previewMedia.length}/10)
                    </span>
                    {uploadingCount > 0 && (
                      <span style={{ fontSize: '0.72rem', color: '#f79a32' }}>
                        ⬆️ Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}…
                      </span>
                    )}
                  </div>

                  {previewMedia.map(item => (
                    <div key={item.id} style={{
                      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                      padding: '0.75rem', background: '#2c1f12', borderRadius: '9px',
                      border: `1px solid ${item.error ? 'rgba(220,61,34,0.4)' : '#4b3422'}`,
                    }}>
                      {/* Thumbnail / icon */}
                      <div style={{ width: '52px', height: '52px', borderRadius: '7px', overflow: 'hidden', flexShrink: 0, background: '#3c2818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {item.media_type === 'image' ? (
                          <img src={item.localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '1.5rem' }}>{mediaIcon(item.media_type)}</span>
                        )}
                      </div>

                      {/* Info + caption + progress */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.775rem', color: '#d3af86', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.filename}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#5c4228', marginBottom: '0.4rem' }}>
                          {formatBytes(item.file_size)} · {item.media_type}
                        </div>

                        {item.uploading ? (
                          <div>
                            <div style={{ height: '4px', background: '#3c2818', borderRadius: '99px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${item.progress}%`, background: 'linear-gradient(90deg,#f79a32,#dc3d22)', transition: 'width 0.2s', borderRadius: '99px' }} />
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#f79a32' }}>{item.progress}% uploaded</span>
                          </div>
                        ) : item.error ? (
                          <span style={{ fontSize: '0.72rem', color: '#dc3d22' }}>⚠️ {item.error}</span>
                        ) : (
                          <input
                            type="text"
                            value={item.caption}
                            onChange={e => updateCaption(item.id, e.target.value)}
                            placeholder="Add caption (optional)…"
                            style={{ width: '100%', padding: '0.3rem 0.5rem', fontSize: '0.72rem', borderRadius: '5px', background: '#3c2818', border: '1px solid #4b3422', color: '#c0a472' }}
                          />
                        )}
                      </div>

                      {/* Remove button */}
                      {!item.uploading && (
                        <button onClick={() => removeMedia(item)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5c4228', fontSize: '1.1rem', padding: '0', flexShrink: 0 }}
                          title="Remove"
                        >×</button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Video preview thumbnails */}
              {previewMedia.some(m => m.media_type === 'video' && !m.uploading && !m.error) && (
                <div style={{ padding: '0.65rem 0.875rem', background: 'rgba(247,154,50,0.06)', border: '1px solid rgba(247,154,50,0.15)', borderRadius: '7px', fontSize: '0.775rem', color: '#f79a32' }}>
                  🎥 Video files will be available for buyers to preview inline on the listing page.
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (!form.title || !form.description || !form.preview_content || !form.price) {
                  setError('Please fill Title, Description, Preview Teaser, and Price.'); return;
                }
                if (uploadingCount > 0) {
                  setError('Wait for all uploads to finish before continuing.'); return;
                }
                setError(''); setStep(2);
              }}
              className="btn btn-primary" style={{ justifyContent: 'center' }}
            >
              Next: Add Full Content →
            </button>
          </div>
        )}

        {/* ══ STEP 2 ════════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {infoBox('🔐 Your content will be encrypted with AES-256-GCM in your browser. It never leaves your device unencrypted.')}
            <div>
              {fLabel('Full Secret Content', true)}
              <textarea value={contentPlain} onChange={e => setContentPlain(e.target.value)}
                rows={12} placeholder={'Write your full earning strategy, method, or information here.\nThis will be encrypted before it leaves your browser…'}
                style={{ ...w100, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8125rem' }} />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setStep(1)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button onClick={encryptContent} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>
                🔒 Encrypt & Continue
              </button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 ════════════════════════════════════════════════════ */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.6rem 0.875rem', background: 'rgba(136,155,74,0.08)', border: '1px solid rgba(136,155,74,0.25)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#a0b85e' }}>
              ✅ <strong>Content encrypted.</strong>&nbsp;Now add public proof so buyers trust your listing.
            </div>

            <div className="card" style={{ padding: '1.25rem', background: 'linear-gradient(135deg, rgba(247,154,50,0.06) 0%, rgba(220,61,34,0.04) 100%)', borderColor: 'rgba(247,154,50,0.2)' }}>
              <h3 style={{ marginBottom: '0.4rem', fontSize: '0.95rem' }}>🎯 Demonstration Section — <span className="text-gradient">Build Trust Without Spoiling</span></h3>
              <p style={{ fontSize: '0.78rem', color: '#8a7359', lineHeight: 1.6 }}>
                Buyers are anonymous and cautious. Upload <strong style={{ color: '#c0a472' }}>redacted / censored</strong> samples that show your info is real — without giving away the full method.
              </p>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              {fLabel('What type of information are you demonstrating?', true)}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                {DEMO_CATEGORIES.map(dc => (
                  <button key={dc.value} onClick={() => setDemoCategory(dc.value)} style={{
                    padding: '0.6rem 0.4rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, textAlign: 'center', transition: 'all 0.18s ease',
                    border: `1px solid ${demoCategory === dc.value ? '#f79a32' : '#4b3422'}`,
                    background: demoCategory === dc.value ? 'rgba(247,154,50,0.1)' : '#3c2818',
                    color: demoCategory === dc.value ? '#f79a32' : '#8a7359',
                  }}>
                    <div style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{dc.icon}</div>
                    {dc.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: '1.25rem', background: 'rgba(57,173,181,0.04)', borderColor: 'rgba(57,173,181,0.15)' }}>
              <p style={{ fontSize: '0.775rem', fontWeight: 700, color: '#39adb5', marginBottom: '0.6rem' }}>💡 Guidance for: {hint.title}</p>
              <ul style={{ paddingLeft: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {hint.tips.map((tip, i) => <li key={i} style={{ fontSize: '0.775rem', color: '#8a7359', lineHeight: 1.55 }}>{tip}</li>)}
              </ul>
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
                {fLabel('Public Demo Excerpt (redacted teaser)')}
                <span style={{ fontSize: '0.7rem', color: demoText.length > 750 ? '#dc3d22' : '#5c4228' }}>{demoText.length}/800</span>
              </div>
              <textarea value={demoText} onChange={e => setDemoText(e.target.value.slice(0, 800))} rows={5}
                placeholder={`Example: "Name: J*** D***, DOB: 19**-**-**, SSN: ***-**-1234 ← verified real address via USPS lookup"\n\nKeep it specific enough to show quality — not enough to reproduce the method.`}
                style={{ ...w100, resize: 'vertical', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', lineHeight: 1.6 }} />
            </div>

            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                {fLabel('Demo Files (screenshots, logs, receipts — max 5)')}
                <span className="badge badge-muted">{demoFiles.length}/5</span>
              </div>
              {demoFiles.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', marginBottom: '0.75rem' }}>
                  {demoFiles.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#3c2818', borderRadius: '7px', border: '1px solid #4b3422' }}>
                      <span>{f.type === 'screenshot' ? '🖼️' : f.type === 'video' ? '🎥' : f.type === 'receipt' ? '🧾' : '📋'}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.75rem', color: '#d3af86', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.url.length > 50 ? f.url.slice(0, 50) + '…' : f.url}</div>
                        {f.caption && <div style={{ fontSize: '0.68rem', color: '#8a7359' }}>{f.caption}</div>}
                      </div>
                      <span className="badge badge-orange" style={{ fontSize: '0.65rem' }}>{f.type}</span>
                      <button onClick={() => removeDemoFile(i)} style={{ background: 'transparent', border: 'none', color: '#5c4228', cursor: 'pointer', fontSize: '1rem' }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              {demoFiles.length < 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(60,40,24,0.5)', borderRadius: '8px', border: '1px dashed #4b3422' }}>
                  <div>{fLabel('File URL (paste hosted link)')}<input value={demoFileInput.url} onChange={e => setDemoFileInput(p => ({ ...p, url: e.target.value }))} placeholder="https://i.imgur.com/example.png" style={w100} /></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.5rem' }}>
                    <div>{fLabel('Type')}<select value={demoFileInput.type} onChange={e => setDemoFileInput(p => ({ ...p, type: e.target.value }))} style={w100}><option value="screenshot">Screenshot</option><option value="video">Video</option><option value="log">Log / Text</option><option value="receipt">Receipt</option><option value="other">Other</option></select></div>
                    <div>{fLabel('Caption')}<input value={demoFileInput.caption} onChange={e => setDemoFileInput(p => ({ ...p, caption: e.target.value }))} placeholder="e.g. Earnings dashboard (blurred)" style={w100} /></div>
                  </div>
                  <button onClick={addDemoFile} className="btn btn-secondary" style={{ alignSelf: 'flex-start' }}>+ Add File</button>
                </div>
              )}
            </div>

            <div className="card" style={{ padding: '1rem', background: 'rgba(220,61,34,0.05)', borderColor: 'rgba(220,61,34,0.2)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={guidance} onChange={e => setGuidance(e.target.checked)} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#f79a32', flexShrink: 0 }} />
                <span style={{ fontSize: '0.78rem', color: '#c0a472', lineHeight: 1.6 }}>
                  I confirm that my demonstration material is <strong style={{ color: '#f79a32' }}>redacted / censored</strong> and does not reveal the full method, credentials, or content.
                  I understand that <strong style={{ color: '#f79a32' }}>posting unredacted private data violates platform rules</strong> and may result in account ban.
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setStep(2)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button onClick={validateDemo} className="btn btn-primary" style={{ flex: 2, justifyContent: 'center' }}>Continue to Review →</button>
            </div>
          </div>
        )}

        {/* ══ STEP 4 ════════════════════════════════════════════════════ */}
        {step === 4 && (
          <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(136,155,74,0.08)', border: '1px solid rgba(136,155,74,0.25)', borderRadius: '9px' }}>
              <p style={{ fontSize: '0.8375rem', fontWeight: 600, color: '#a0b85e', marginBottom: '0.2rem' }}>✅ Content Encrypted</p>
              <p style={{ fontSize: '0.75rem', color: '#8a7359' }}>AES-256-GCM applied. Key stored locally, released to buyers after purchase.</p>
            </div>

            <div style={{ background: '#3c2818', borderRadius: '9px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                ['Title',       form.title],
                ['Category',    form.category || '—'],
                ['Tags',        form.tags || '—'],
                ['Price',       `₦${Number(form.price).toLocaleString()}`],
                ['Fee (15%)',   `₦${(Number(form.price) * 0.15).toLocaleString(undefined, { minimumFractionDigits: 2 })}`],
                ['Preview Media', `${previewMedia.filter(m => !m.error && !m.uploading).length} file(s) attached`],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#8a7359' }}>{k}</span>
                  <span style={{ color: '#d3af86', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(75,52,34,0.5)', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', fontWeight: 700 }}>
                <span style={{ color: '#c0a472' }}>You receive</span>
                <span className="text-gradient">₦{(Number(form.price) * 0.85).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Preview media thumbnails */}
            {previewMedia.filter(m => !m.error).length > 0 && (
              <div>
                <p style={{ fontSize: '0.75rem', color: '#8a7359', fontWeight: 600, marginBottom: '0.5rem' }}>Preview Media Attached</p>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {previewMedia.filter(m => !m.error).map(m => (
                    <div key={m.id} style={{ width: '52px', height: '52px', borderRadius: '7px', overflow: 'hidden', background: '#3c2818', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #4b3422' }}>
                      {m.media_type === 'image'
                        ? <img src={m.localUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '1.5rem' }}>{mediaIcon(m.media_type)}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ padding: '0.75rem 1rem', background: 'rgba(247,154,50,0.06)', border: '1px solid rgba(247,154,50,0.18)', borderRadius: '9px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f79a32', marginBottom: '0.4rem' }}>🎯 Demonstration Attached</p>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.775rem', color: '#8a7359' }}>
                <span>Category: <strong style={{ color: '#c0a472' }}>{DEMO_CATEGORIES.find(d => d.value === demoCategory)?.label}</strong></span>
                <span>Files: <strong style={{ color: '#c0a472' }}>{demoFiles.length}</strong></span>
                <span>Text: <strong style={{ color: '#c0a472' }}>{demoText.length > 0 ? `${demoText.length} chars` : 'None'}</strong></span>
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.875rem', background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.15)', borderRadius: '7px', fontSize: '0.775rem', color: '#39adb5' }}>
              🔍 Your listing will enter the <strong>Verification Queue</strong> after publishing.
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setStep(3)} className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }}>← Back</button>
              <button onClick={submitListing} disabled={submitting} id="publish-listing-btn"
                className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
                {submitting
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />Publishing…
                    </span>
                  : '🚀 Publish Listing'}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
