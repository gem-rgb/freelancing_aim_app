'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Bounty {
  id: string; title: string; description: string; reward: number;
  buyer_username: string; buyer_reputation: number; status: string;
  priority: string; category: string; tags_list: string[];
  submission_count: number; view_count: number; deadline: string | null; created_at: string;
}

const PRIORITY_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  urgent: { bg: 'rgba(220,61,34,0.12)',  color: '#f2704a', border: 'rgba(220,61,34,0.28)'  },
  high:   { bg: 'rgba(247,154,50,0.12)', color: '#f79a32', border: 'rgba(247,154,50,0.28)' },
  medium: { bg: 'rgba(247,154,50,0.08)', color: '#c0a472', border: 'rgba(247,154,50,0.2)'  },
  low:    { bg: 'rgba(138,115,89,0.1)',  color: '#8a7359', border: 'rgba(138,115,89,0.2)'  },
};

function BountyCard({ bounty }: { bounty: Bounty }) {
  const p = PRIORITY_STYLE[bounty.priority] || PRIORITY_STYLE.low;
  return (
    <Link href={`/bounties/${bounty.id}`} style={{ textDecoration: 'none', display: 'block' }}>
      <div className="card" style={{ height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
          <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.2rem 0.55rem', borderRadius: '999px', background: p.bg, color: p.color, border: `1px solid ${p.border}`, textTransform: 'capitalize' }}>
            {bounty.priority}
          </span>
          <span style={{ fontSize: '0.675rem', color: '#5c4228' }}>{bounty.submission_count} submission{bounty.submission_count !== 1 ? 's' : ''}</span>
        </div>
        <h3 className="line-clamp-2" style={{ fontSize: '0.875rem', marginBottom: '0.4rem' }}>{bounty.title}</h3>
        <p className="line-clamp-2" style={{ fontSize: '0.775rem', color: '#8a7359', marginBottom: '0.6rem' }}>{bounty.description}</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.6rem' }}>
          {bounty.tags_list.slice(0, 3).map(tag => (
            <span key={tag} style={{ fontSize: '0.675rem', color: '#8a7359', background: 'rgba(75,52,34,0.5)', padding: '0.15rem 0.45rem', borderRadius: '999px' }}>#{tag}</span>
          ))}
        </div>
        {bounty.deadline && (
          <p style={{ fontSize: '0.7rem', color: '#5c4228', marginBottom: '0.6rem' }}>⏰ Deadline: {new Date(bounty.deadline).toLocaleDateString()}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(75,52,34,0.4)', paddingTop: '0.6rem' }}>
          <div>
            <p className="text-gradient" style={{ fontSize: '1rem', fontWeight: 800 }}>₦{Number(bounty.reward).toLocaleString()}</p>
            <p style={{ fontSize: '0.675rem', color: '#5c4228', marginTop: '0.1rem' }}>by {bounty.buyer_username}</p>
          </div>
          <span style={{ fontSize: '0.725rem', fontWeight: 600, padding: '0.25rem 0.65rem', borderRadius: '5px', background: 'rgba(247,154,50,0.1)', color: '#f79a32', border: '1px solid rgba(247,154,50,0.22)' }}>
            Submit →
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BountiesPage() {
  const { isAuthenticated } = useAuth();
  const [bounties, setBounties]     = useState<Bounty[]>([]);
  const [loading, setLoading]       = useState(true);
  const [status, setStatus]         = useState('open');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', requirements: '', reward: '', category: '', tags: '', priority: 'medium', deadline: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    apiService.getBounties({ status }).then(r => { setBounties(r.data.results || r.data); }).finally(() => setLoading(false));
  }, [status]);

  const createBounty = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiService.createBounty({ ...form, reward: parseFloat(form.reward) } as any);
      setShowCreate(false);
      setStatus('open');
      const r = await apiService.getBounties({ status: 'open' });
      setBounties(r.data.results || r.data);
    } catch (e: any) { alert(e.response?.data?.error || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const STATUS_TABS = [
    { key: 'open',        label: 'Open'        },
    { key: 'in_progress', label: 'In Progress'  },
    { key: 'completed',   label: 'Completed'    },
  ];

  return (
    <main style={{ minHeight: '100vh' }}>
      {/* Header */}
      <section style={{ borderBottom: '1px solid rgba(75,52,34,0.4)', background: 'rgba(44,31,18,0.4)', padding: '2rem 0 1.5rem' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ marginBottom: '0.3rem' }}>
              <span className="text-gradient">Bounty</span> Board
            </h1>
            <p style={{ fontSize: '0.8375rem', color: '#8a7359' }}>
              Post a problem, receive encrypted solutions. Pay only on acceptance.
            </p>
          </div>
          {isAuthenticated && (
            <button onClick={() => setShowCreate(true)} id="post-bounty-btn" className="btn btn-primary btn-lg">
              + Post a Bounty
            </button>
          )}
        </div>
      </section>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '3rem' }}>
        {/* Status tabs */}
        <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '1.25rem' }}>
          {STATUS_TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setStatus(t.key)}
              style={{
                padding: '0.3rem 0.85rem', borderRadius: '5px',
                fontSize: '0.775rem', fontWeight: 500, cursor: 'pointer', border: '1px solid',
                background:   status === t.key ? 'rgba(247,154,50,0.15)' : '#3c2818',
                color:        status === t.key ? '#f79a32'               : '#8a7359',
                borderColor:  status === t.key ? 'rgba(247,154,50,0.4)'  : '#4b3422',
                transition: 'all 0.15s ease',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid-container grid-responsive">
            {[...Array(6)].map((_, i) => <div key={i} style={{ background: '#3c2818', borderRadius: '13px', height: '180px', opacity: 0.6 }} />)}
          </div>
        ) : bounties.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <p style={{ color: '#5c4228', fontSize: '0.9rem' }}>No bounties found. Be the first to post one!</p>
          </div>
        ) : (
          <div className="grid-container grid-responsive">
            {bounties.map(b => <BountyCard key={b.id} bounty={b} />)}
          </div>
        )}
      </div>

      {/* Create Bounty Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '1rem', overflowY: 'auto' }}>
          <div className="card" style={{ width: '100%', maxWidth: '480px', padding: '1.5rem', margin: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <h2 style={{ fontSize: '1rem' }}>Post a Bounty</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a7359', fontSize: '1.25rem', lineHeight: 1 }}>✕</button>
            </div>
            <form onSubmit={createBounty} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input required value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Bounty title" style={{ width: '100%' }} />
              <textarea required value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="What problem do you need solved?" style={{ width: '100%', resize: 'none' }} />
              <textarea required value={form.requirements} onChange={e => setForm(p => ({ ...p, requirements: e.target.value }))} rows={2} placeholder="Detailed requirements for the solution" style={{ width: '100%', resize: 'none' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <input required type="number" min="100" value={form.reward} onChange={e => setForm(p => ({ ...p, reward: e.target.value }))} placeholder="Reward (₦)" style={{ width: '100%' }} />
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))} style={{ width: '100%' }}>
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="Tags (comma-separated)" style={{ width: '100%' }} />
              <input type="datetime-local" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} style={{ width: '100%' }} />
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: submitting ? 0.6 : 1 }}>
                {submitting ? 'Posting…' : 'Post Bounty'}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
