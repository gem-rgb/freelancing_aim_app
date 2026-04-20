'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';
import { EncryptionService } from '@/utils/encryption';

interface Bounty {
  id: string; title: string; description: string; requirements: string;
  reward: number; buyer_username: string; buyer_reputation: number;
  status: string; priority: string; tags_list: string[];
  submission_count: number; deadline: string | null; created_at: string;
}
interface Submission {
  id: string; seller_username: string; seller_reputation: number;
  encrypted_solution: string; solution_hash: string;
  submission_notes: string; status: string; submitted_at: string;
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  urgent: { bg: 'rgba(220,61,34,0.12)',  color: '#f2704a', border: 'rgba(220,61,34,0.28)'  },
  high:   { bg: 'rgba(247,154,50,0.12)', color: '#f79a32', border: 'rgba(247,154,50,0.28)' },
  medium: { bg: 'rgba(247,154,50,0.08)', color: '#c0a472', border: 'rgba(247,154,50,0.2)'  },
  low:    { bg: 'rgba(138,115,89,0.1)',  color: '#8a7359', border: 'rgba(138,115,89,0.2)'  },
};

const SUB_STATUS: Record<string, { bg: string; color: string }> = {
  accepted: { bg: 'rgba(136,155,74,0.12)', color: '#a0b85e' },
  rejected: { bg: 'rgba(220,61,34,0.12)',  color: '#f2704a' },
  pending:  { bg: 'rgba(247,154,50,0.1)',  color: '#f79a32' },
  withdrawn:{ bg: 'rgba(92,66,40,0.1)',    color: '#5c4228' },
};

export default function BountyDetailPage() {
  const { id } = useParams() as { id: string };
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [bounty, setBounty]           = useState<Bounty | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showSubmit, setShowSubmit]   = useState(false);
  const [solutionText, setSolutionText] = useState('');
  const [notes, setNotes]             = useState('');
  const [submitting, setSubmitting]   = useState(false);

  useEffect(() => {
    Promise.all([
      apiService.getBounty(id),
      apiService.getBountySubmissions(id),
    ]).then(([bRes, sRes]) => {
      setBounty(bRes.data);
      setSubmissions(sRes.data.results || sRes.data);
    }).catch(() => router.push('/bounties'))
      .finally(() => setLoading(false));
  }, [id]);

  const submitSolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bounty || !solutionText.trim()) return;
    setSubmitting(true);
    try {
      let encrypted = solutionText;
      try { encrypted = EncryptionService.encryptAES(solutionText, EncryptionService.generateAESKey()).encrypted; } catch {}
      const hash = EncryptionService.generateHash(solutionText);
      await apiService.submitToBounty(id, { encrypted_solution: encrypted, solution_hash: hash, submission_notes: notes });
      setShowSubmit(false); setSolutionText(''); setNotes('');
      const r = await apiService.getBountySubmissions(id);
      setSubmissions(r.data.results || r.data);
      setBounty(prev => prev ? { ...prev, submission_count: prev.submission_count + 1 } : prev);
    } catch (e: any) { alert(e.response?.data?.error || 'Submission failed'); }
    finally { setSubmitting(false); }
  };

  const acceptSub = async (subId: string) => {
    try {
      await apiService.acceptSubmission(subId);
      setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: 'accepted' } : { ...s, status: s.status === 'pending' ? 'rejected' : s.status }));
      setBounty(prev => prev ? { ...prev, status: 'completed' } : prev);
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '36px', height: '36px' }} />
    </div>
  );
  if (!bounty) return null;

  const isBuyer = user?.username === bounty.buyer_username;
  const pStyle  = PRIORITY_STYLE[bounty.priority] || PRIORITY_STYLE.low;

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 0 3rem' }}>
      <div className="container" style={{ maxWidth: '820px' }}>

        {/* Breadcrumb */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#8a7359', marginBottom: '1.25rem' }}>
          <Link href="/bounties" style={{ color: '#8a7359' }}>Bounties</Link>
          <span>›</span>
          <span style={{ color: '#d3af86' }} className="line-clamp-1">{bounty.title}</span>
        </nav>

        {/* Header card */}
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: '999px', background: pStyle.bg, color: pStyle.color, border: `1px solid ${pStyle.border}`, textTransform: 'capitalize' }}>
              {bounty.priority} priority
            </span>
            <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.2rem 0.65rem', borderRadius: '999px', background: 'rgba(75,52,34,0.5)', color: '#8a7359', textTransform: 'capitalize' }}>
              {bounty.status}
            </span>
          </div>
          <h1 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>{bounty.title}</h1>
          <p style={{ fontSize: '0.8375rem', color: '#c0a472', lineHeight: 1.7, marginBottom: '0.75rem' }}>{bounty.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '1rem' }}>
            {bounty.tags_list.map(t => (
              <span key={t} style={{ fontSize: '0.675rem', color: '#8a7359', background: 'rgba(75,52,34,0.5)', padding: '0.15rem 0.45rem', borderRadius: '999px' }}>#{t}</span>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', borderTop: '1px solid rgba(75,52,34,0.4)', paddingTop: '0.875rem' }}>
            {[
              ['Reward',      `₦${Number(bounty.reward).toLocaleString()}`, '#f79a32'],
              ['Submissions', String(bounty.submission_count),              '#d3af86'],
              ['Posted by',   bounty.buyer_username,                        '#c0a472'],
              ['Deadline',    bounty.deadline ? new Date(bounty.deadline).toLocaleDateString() : 'Open', '#8a7359'],
            ].map(([k, v, col]) => (
              <div key={k}>
                <p style={{ fontSize: '0.675rem', color: '#5c4228', marginBottom: '0.2rem' }}>{k}</p>
                <p style={{ fontSize: '0.9375rem', fontWeight: 700, color: col }}>{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Requirements */}
        <div className="card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '0.9375rem', marginBottom: '0.75rem' }}>Requirements</h2>
          <p style={{ fontSize: '0.8375rem', color: '#c0a472', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{bounty.requirements}</p>
        </div>

        {/* CTA */}
        {isAuthenticated && !isBuyer && bounty.status === 'open' && (
          <button onClick={() => setShowSubmit(true)} className="btn btn-primary" id="submit-solution-btn"
            style={{ width: '100%', justifyContent: 'center', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            🔒 Submit Encrypted Solution →
          </button>
        )}
        {!isAuthenticated && bounty.status === 'open' && (
          <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
            <Link href="/login" className="btn btn-primary" style={{ justifyContent: 'center' }}>Sign in to Submit →</Link>
          </div>
        )}

        {/* Submissions */}
        {submissions.length > 0 && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.9375rem', marginBottom: '0.875rem' }}>
              Submissions <span style={{ color: '#8a7359', fontWeight: 400, fontSize: '0.8rem' }}>({submissions.length})</span>
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {submissions.map(s => {
                const ss = SUB_STATUS[s.status] || SUB_STATUS.pending;
                return (
                  <article key={s.id} style={{ padding: '0.875rem', background: '#3c2818', borderRadius: '9px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#d3af86' }}>{s.seller_username}</span>
                        <span style={{ fontSize: '0.7rem', color: '#8a7359' }}>⭐ {s.seller_reputation.toFixed(1)}</span>
                      </div>
                      <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.18rem 0.55rem', borderRadius: '999px', background: ss.bg, color: ss.color }}>{s.status}</span>
                    </div>
                    {s.submission_notes && <p style={{ fontSize: '0.775rem', color: '#c0a472', marginBottom: '0.4rem' }}>{s.submission_notes}</p>}
                    <p style={{ fontSize: '0.675rem', color: '#5c4228', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      SHA-256: {s.solution_hash}
                    </p>
                    {isBuyer && s.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem' }}>
                        <button onClick={() => acceptSub(s.id)} style={{ padding: '0.3rem 0.875rem', borderRadius: '7px', background: 'rgba(136,155,74,0.12)', border: '1px solid rgba(136,155,74,0.3)', color: '#a0b85e', fontSize: '0.775rem', cursor: 'pointer' }}>
                          ✓ Accept
                        </button>
                        <button onClick={() => apiService.rejectSubmission(s.id, { rejection_reason: 'Not suitable' })}
                          style={{ padding: '0.3rem 0.875rem', borderRadius: '7px', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', color: '#f2704a', fontSize: '0.775rem', cursor: 'pointer' }}>
                          ✕ Reject
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/bounties" className="btn btn-ghost btn-sm">← Back to Bounties</Link>
        </div>
      </div>

      {/* Submit Modal */}
      {showSubmit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem' }}>
          <div className="card" style={{ width: '100%', maxWidth: '520px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '1rem' }}>Submit Encrypted Solution</h2>
              <button onClick={() => setShowSubmit(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a7359', fontSize: '1.25rem' }}>✕</button>
            </div>
            <div style={{ marginBottom: '0.875rem', padding: '0.65rem 0.875rem', background: 'rgba(57,173,181,0.07)', border: '1px solid rgba(57,173,181,0.2)', borderRadius: '7px', fontSize: '0.775rem', color: '#39adb5' }}>
              🔐 Your solution will be encrypted before upload. Only the buyer can decrypt it after accepting.
            </div>
            <form onSubmit={submitSolution} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <textarea required value={solutionText} onChange={e => setSolutionText(e.target.value)} rows={8}
                placeholder="Write your complete solution here…"
                style={{ width: '100%', resize: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem' }} />
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                placeholder="Notes about your submission (visible to buyer)…"
                style={{ width: '100%', resize: 'none', fontSize: '0.8rem' }} />
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
                {submitting
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />Encrypting & Submitting…</span>
                  : '🔒 Submit Encrypted Solution'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
