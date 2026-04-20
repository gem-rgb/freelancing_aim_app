'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLoginPage() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');
  const { staffLogin, logout, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const loginInProgress = useRef(false);

  /* ── If already logged in as staff → go to dashboard ── */
  useEffect(() => {
    if (loginInProgress.current) return;
    if (!authLoading && isAuthenticated && user?.is_staff) {
      router.replace('/admin/dashboard');
    }
    /* If logged in as NON-staff → sign them out silently so admin login is clean */
    if (!authLoading && isAuthenticated && user && !user.is_staff) {
      logout();
    }
  }, [authLoading, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    loginInProgress.current = true;
    try {
      await staffLogin(username, password);
      router.replace('/admin/dashboard');
    } catch (err: any) {
      const data = err.response?.data;
      setError(
        typeof data === 'string' ? data :
        data?.detail || data?.non_field_errors?.[0] ||
        'Invalid credentials. Please check your username and password.'
      );
    } finally {
      setIsLoading(false);
      loginInProgress.current = false;
    }
  };

  /* While auth resolves */
  if (authLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1a0e06,#2d1810)' }}>
      <div className="spinner" style={{ width: '28px', height: '28px' }} />
    </main>
  );

  /* Staff already logged in — blank while redirecting */
  if (isAuthenticated && user?.is_staff) return null;

  return (
    <main style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem 1.25rem', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, #0e0804 0%, #1e0f08 50%, #2d1810 100%)',
    }}>
      {/* Ambient red glows */}
      <div style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(220,61,34,0.04)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(247,154,50,0.03)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      {/* ADMIN badge at top */}
      <div style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.3)', borderRadius: '999px', padding: '0.35rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#dc3d22', boxShadow: '0 0 6px rgba(220,61,34,0.8)', display: 'inline-block' }} />
        <span style={{ fontSize: '0.75rem', color: '#dc3d22', fontWeight: 700, letterSpacing: '0.08em' }}>STAFF PORTAL — RESTRICTED ACCESS</span>
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'linear-gradient(135deg,#dc3d22,#f79a32)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.1rem' }}>A</div>
            <span style={{ color: '#d3af86', fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>AIM<span style={{ color: '#dc3d22', marginLeft: '0.3rem', fontSize: '0.75rem', fontWeight: 600, verticalAlign: 'middle', background: 'rgba(220,61,34,0.12)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(220,61,34,0.25)' }}>ADMIN</span></span>
          </div>
          <h1 style={{ fontSize: '1.375rem', marginBottom: '0.3rem', color: '#fff' }}>Staff Login</h1>
          <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>Access restricted to authorized personnel only</p>
        </div>

        {/* Card */}
        <div style={{ background: 'rgba(20,12,6,0.97)', border: '1px solid rgba(220,61,34,0.2)', borderRadius: '14px', padding: '2rem', boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}>

          {error && (
            <div role="alert" style={{ marginBottom: '1.25rem', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.3)', color: '#f2704a', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <span style={{ flexShrink: 0 }}>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="admin-username" style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.5rem' }}>Staff Username</label>
              <input
                id="admin-username" name="username" type="text" required
                value={username}
                onChange={e => { setUsername(e.target.value); setError(''); }}
                placeholder="staff_username"
                autoComplete="username"
                aria-invalid={!!error}
                style={{ width: '100%', background: '#1e1208', border: '1px solid rgba(220,61,34,0.2)', borderRadius: '8px', padding: '0.75rem', color: '#d3af86', fontSize: '0.875rem' }}
              />
            </div>

            <div>
              <label htmlFor="admin-password" style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.5rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  required value={password}
                  onChange={e => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ width: '100%', paddingRight: '3rem', background: '#1e1208', border: '1px solid rgba(220,61,34,0.2)', borderRadius: '8px', padding: '0.75rem', color: '#d3af86', fontSize: '0.875rem' }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#5c4228', padding: '0.2rem' }}>
                  <span aria-hidden="true">{showPassword ? '🙈' : '👁️'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="admin-login-submit-btn"
              disabled={isLoading || !username || !password}
              style={{
                width: '100%', padding: '0.875rem', borderRadius: '9px', border: 'none',
                background: isLoading || !username || !password ? 'rgba(220,61,34,0.3)' : 'linear-gradient(135deg,#dc3d22,#f79a32)',
                color: '#fff', fontWeight: 700, fontSize: '0.9rem',
                cursor: isLoading || !username || !password ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
            >
              {isLoading ? (
                <><span className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />Authenticating…</>
              ) : '🔐 Login to Admin Panel'}
            </button>
          </form>

          <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(75,52,34,0.3)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.775rem', color: '#5c4228' }}>
              Not staff?{' '}
              <Link href="/login" style={{ color: '#8a7359', fontWeight: 600 }}>Regular user login →</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#3c2818', marginTop: '1.25rem' }}>
          🚨 All access attempts to this portal are logged and monitored
        </p>
      </div>
    </main>
  );
}
