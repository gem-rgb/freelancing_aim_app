'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiService } from '@/utils/api';
import { useAuth } from '@/contexts/AuthContext';

interface Stake {
  id: string; amount: number; is_locked: boolean;
  lock_reason: string; created_at: string; released_at: string | null;
}

interface Stats { stake_balance: number; reputation_score: number; }

export default function StakingPage() {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [stakes, setStakes]     = useState<Stake[]>([]);
  const [stats, setStats]       = useState<Stats | null>(null);
  const [amount, setAmount]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [staking, setStaking]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    Promise.all([apiService.getMyStakes(), apiService.getUserStats()])
      .then(([sRes, stRes]) => {
        setStakes(sRes.data.results || sRes.data);
        setStats(stRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num < 500) { setError('Minimum stake is ₦500'); return; }
    setStaking(true); setError(''); setSuccess('');
    try {
      await apiService.createStake({ amount: num });
      setSuccess(`₦${num.toLocaleString()} staked successfully!`);
      setAmount('');
      const [sRes, stRes] = await Promise.all([apiService.getMyStakes(), apiService.getUserStats()]);
      setStakes(sRes.data.results || sRes.data);
      setStats(stRes.data);
    } catch (e: any) { setError(e.response?.data?.error || 'Failed to stake'); }
    finally { setStaking(false); }
  };

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '32px', height: '32px' }} />
    </div>
  );

  const totalStaked  = stakes.reduce((s, k) => s + Number(k.amount), 0);
  const lockedStaked = stakes.filter(k => k.is_locked).reduce((s, k) => s + Number(k.amount), 0);

  return (
    <main style={{ minHeight: '100vh', padding: '2rem 0 3rem' }}>
      <div className="container" style={{ maxWidth: '680px' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.775rem', color: '#8a7359', marginBottom: '0.75rem' }}>
            <Link href="/dashboard" style={{ color: '#8a7359' }}>Dashboard</Link>
            <span>›</span>
            <span style={{ color: '#d3af86' }}>Staking</span>
          </nav>
          <h1 style={{ marginBottom: '0.3rem' }}>
            <span className="text-gradient">Staking</span>
          </h1>
          <p style={{ fontSize: '0.8375rem', color: '#8a7359' }}>
            Stake ₦ to boost your listing visibility and signal trustworthiness. Stakes are slashed if a dispute is resolved against you.
          </p>
        </div>

        {/* Stats Overview */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.875rem', marginBottom: '1.5rem' }}>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: '#f79a32', marginBottom: '0.2rem' }}>
              ₦{totalStaked.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#8a7359' }}>Total Staked</p>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: '#dc3d22', marginBottom: '0.2rem' }}>
              ₦{lockedStaked.toLocaleString()}
            </p>
            <p style={{ fontSize: '0.7rem', color: '#8a7359' }}>Locked</p>
          </div>
          <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
            <p style={{ fontSize: '1.125rem', fontWeight: 800, color: '#889b4a', marginBottom: '0.2rem' }}>
              {Number(stats?.reputation_score || 0).toFixed(1)} ⭐
            </p>
            <p style={{ fontSize: '0.7rem', color: '#8a7359' }}>Reputation</p>
          </div>
        </div>

        {/* How staking works */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', marginBottom: '0.875rem' }}>How Staking Works</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {[
              ['🔒', 'Lock ₦500+ in your seller stake to activate boosted listing visibility'],
              ['⭐', 'Higher stake = higher search ranking and a trust badge on your listings'],
              ['⚠️', 'If a dispute resolves against you, a portion of your stake is slashed'],
              ['✅', 'Stake is returned when all your transactions clear without disputes'],
            ].map(([icon, text], i) => (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', fontSize: '0.8125rem', color: '#c0a472' }}>
                <span style={{ flexShrink: 0 }}>{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stake form */}
        <div className="card" style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Deposit Stake</h2>

          {error && (
            <div role="alert" style={{ marginBottom: '0.875rem', padding: '0.6rem 0.875rem', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', borderRadius: '7px', fontSize: '0.8rem', color: '#f2704a' }}>
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div role="status" style={{ marginBottom: '0.875rem', padding: '0.6rem 0.875rem', background: 'rgba(136,155,74,0.1)', border: '1px solid rgba(136,155,74,0.25)', borderRadius: '7px', fontSize: '0.8rem', color: '#a0b85e' }}>
              ✅ {success}
            </div>
          )}

          <form onSubmit={handleStake} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            <div>
              <label htmlFor="stake-amount" style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>
                Amount (₦) — minimum ₦500
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  id="stake-amount"
                  type="number"
                  min="500"
                  step="100"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="e.g. 1000"
                  style={{ flex: 1 }}
                />
                {/* Quick presets */}
                {[500, 1000, 5000].map(preset => (
                  <button key={preset} type="button" onClick={() => setAmount(String(preset))}
                    style={{ padding: '0.45rem 0.65rem', borderRadius: '7px', fontSize: '0.725rem', fontWeight: 600, background: amount === String(preset) ? 'rgba(247,154,50,0.15)' : '#3c2818', color: amount === String(preset) ? '#f79a32' : '#8a7359', border: '1px solid', borderColor: amount === String(preset) ? 'rgba(247,154,50,0.3)' : '#4b3422', cursor: 'pointer' }}>
                    ₦{(preset/1000).toFixed(preset >= 1000 ? 0 : 0)}{ preset >= 1000 ? 'k' : ''}
                    {preset === 500 ? '500' : preset === 1000 ? '1k' : '5k'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding: '0.65rem 0.875rem', background: 'rgba(57,173,181,0.06)', border: '1px solid rgba(57,173,181,0.18)', borderRadius: '7px', fontSize: '0.775rem', color: '#39adb5' }}>
              ℹ️ Stake deposits are processed via your connected wallet. Funds will be locked until your transaction history clears.
            </div>

            <button type="submit" disabled={staking || !amount} className="btn btn-primary"
              style={{ justifyContent: 'center', opacity: (staking || !amount) ? 0.6 : 1 }}>
              {staking ? 'Processing…' : `Stake ₦${amount ? Number(amount).toLocaleString() : '–'}`}
            </button>
          </form>
        </div>

        {/* Stake history */}
        {stakes.length > 0 && (
          <div className="card" style={{ padding: '1.25rem' }}>
            <h2 style={{ fontSize: '0.9375rem', marginBottom: '1rem' }}>Stake History</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stakes.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: '#3c2818', borderRadius: '7px', gap: '0.5rem' }}>
                  <div>
                    <p style={{ fontSize: '0.875rem', fontWeight: 700, color: '#d3af86' }}>
                      ₦{Number(s.amount).toLocaleString()}
                    </p>
                    <p style={{ fontSize: '0.7rem', color: '#8a7359', marginTop: '0.1rem' }}>
                      {new Date(s.created_at).toLocaleDateString()} · {s.lock_reason}
                    </p>
                  </div>
                  <span style={{ fontSize: '0.675rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px',
                    background: s.is_locked ? 'rgba(220,61,34,0.12)' : 'rgba(136,155,74,0.12)',
                    color:      s.is_locked ? '#f2704a'              : '#a0b85e',
                    border: '1px solid',
                    borderColor: s.is_locked ? 'rgba(220,61,34,0.3)' : 'rgba(136,155,74,0.3)',
                  }}>
                    {s.is_locked ? '🔒 Locked' : '✅ Released'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <Link href="/dashboard" className="btn btn-ghost btn-sm">← Back to Dashboard</Link>
        </div>
      </div>
    </main>
  );
}
