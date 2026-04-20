'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [localError, setLocalError]       = useState('');
  const { login, error: authError, clearError, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const error = localError || authError;

  /* ── If already logged in, skip login → go to their dashboard ── */
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      // Staff should always go through /admin/login
      if (user.is_staff) { router.replace('/admin/dashboard'); return; }
      const dest = user.user_type === 'seller' ? '/dashboard/seller' : '/dashboard/buyer';
      router.replace(dest);
    }
  }, [authLoading, isAuthenticated, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    setLocalError('');
    try {
      const loggedInUser = await login(username, password);
      const dest = loggedInUser?.user_type === 'seller' ? '/dashboard/seller' : '/dashboard/buyer';
      router.replace(dest);
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.detail) {
        setLocalError(data.detail);
      }
    }
    finally { setIsLoading(false); }
  };

  /* Show spinner while auth state loads */
  if (authLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '28px', height: '28px' }} />
    </main>
  );

  /* If authenticated, show nothing while redirect fires */
  if (isAuthenticated) return null;

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-80px', left: '-80px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(247,154,50,0.06)', filter: 'blur(80px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-60px', right: '-60px', width: '240px', height: '240px', borderRadius: '50%', background: 'rgba(220,61,34,0.05)', filter: 'blur(70px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '360px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <Link href="/" aria-label="AIM — Home" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1.25rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg,#f79a32,#dc3d22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>A</div>
            <span style={{ color: '#d3af86', fontWeight: 700, fontSize: '0.9375rem' }}>AIM</span>
          </Link>
          <h1 style={{ fontSize: '1.375rem', marginBottom: '0.25rem' }}>Welcome back</h1>
          <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>Sign in to your anonymous account</p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {error && (
            <div role="alert" style={{ marginBottom: '1rem', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', color: '#f2704a', borderRadius: '7px', padding: '0.6rem 0.875rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="username" style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>Username</label>
              <input
                id="username" name="username" type="text" required
                value={username}
                onChange={e => { setUsername(e.target.value); clearError(); }}
                placeholder="your_anon_handle"
                autoComplete="username"
                aria-invalid={!!error}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label htmlFor="password" style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password" name="password"
                  type={showPassword ? 'text' : 'password'}
                  required value={password}
                  onChange={e => { setPassword(e.target.value); clearError(); }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{ width: '100%', paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8a7359', padding: '0.2rem' }}
                >
                  <span aria-hidden="true">{showPassword ? '🙈' : '👁️'}</span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="login-submit-btn"
              disabled={isLoading || !username || !password}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', marginTop: '0.25rem', opacity: (isLoading || !username || !password) ? 0.5 : 1 }}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />
                  Signing in…
                </span>
              ) : 'Sign In →'}
            </button>
          </form>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(75,52,34,0.4)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.775rem', color: '#8a7359' }}>
              No account?{' '}
              <Link href="/register" style={{ color: '#f79a32', fontWeight: 600 }}>Create one anonymously</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.725rem', color: '#5c4228', marginTop: '1rem' }}>
          🔐 Your identity is never revealed on this platform
        </p>
      </div>
    </main>
  );
}
