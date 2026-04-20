'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EncryptionService } from '@/utils/encryption';
import { apiService } from '@/utils/api';

function RegisterPageInner() {
  const searchParams    = useSearchParams();
  const defaultRole     = (searchParams.get('role') === 'seller' ? 'seller' : 'buyer') as 'buyer' | 'seller';

  const [step, setStep]                         = useState<1 | 2 | 3>(1);
  const [formData, setFormData]                 = useState({
    username: '', password: '', confirm_password: '',
    user_type: defaultRole, email: '',
    public_key: '', encrypted_private_key: '',
  });
  const [generatingKeys, setGeneratingKeys]     = useState(false);
  const [keysGenerated, setKeysGenerated]       = useState(false);
  const [privateKeyDownloaded, setPrivateKeyDownloaded] = useState(false);
  const [showPassword, setShowPassword]         = useState(false);
  const [isLoading, setIsLoading]               = useState(false);
  const [generatingUsername, setGeneratingUsername] = useState(false);

  // OTP step
  const [otp, setOtp]                 = useState('');
  const [otpError, setOtpError]       = useState('');
  const [otpLoading, setOtpLoading]   = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  const { register, error, clearError, generateUsername } = useAuth();
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    clearError();
  };

  const handleGenerateUsername = useCallback(async () => {
    setGeneratingUsername(true);
    try {
      const username = await generateUsername();
      setFormData(prev => ({ ...prev, username }));
    } catch {
      setFormData(prev => ({ ...prev, username: `anon_${Math.random().toString(36).slice(2, 10)}` }));
    } finally { setGeneratingUsername(false); }
  }, [generateUsername]);

  const handleGenerateKeys = useCallback(async () => {
    setGeneratingKeys(true);
    try {
      await new Promise(r => setTimeout(r, 50));
      const keys = EncryptionService.generateKeyPair();
      setFormData(prev => ({ ...prev, public_key: keys.publicKey, encrypted_private_key: keys.privateKey }));
      setKeysGenerated(true);
    } finally { setGeneratingKeys(false); }
  }, []);

  const downloadPrivateKey = () => {
    const blob = new Blob([formData.encrypted_private_key], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `AIM_private_key_${formData.username || 'account'}.pem`; a.click();
    URL.revokeObjectURL(url);
    setPrivateKeyDownloaded(true);
  };

  const startCooldown = (seconds = 60) => {
    setResendCooldown(seconds);
    const tick = () => setResendCooldown(p => {
      if (p <= 1) { return 0; }
      cooldownRef.current = setTimeout(tick, 1000);
      return p - 1;
    });
    cooldownRef.current = setTimeout(tick, 1000);
  };

  useEffect(() => () => { if (cooldownRef.current) clearTimeout(cooldownRef.current); }, []);

  /* ── Register and decide whether OTP step is needed ── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirm_password) return;
    setIsLoading(true); clearError();
    try {
      const res: any = await register(formData);
      if (res?.requires_otp) {
        setStep(3);
        startCooldown(60);
      } else {
        const dest = formData.user_type === 'seller' ? '/dashboard' : '/listings';
        router.push(dest);
      }
    } catch { }
    finally { setIsLoading(false); }
  };

  /* ── OTP verification ── */
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true); setOtpError('');
    try {
      await apiService.verifyOTP(otp);
      const dest = formData.user_type === 'seller' ? '/dashboard' : '/listings';
      router.push(dest);
    } catch (err: any) {
      setOtpError(err?.response?.data?.error || 'Invalid or expired code. Try again.');
    } finally { setOtpLoading(false); }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    try {
      await apiService.requestOTP(formData.email);
      startCooldown(60);
    } catch (err: any) {
      setOtpError(err?.response?.data?.error || 'Failed to resend code.');
    }
  };

  const passwordsMatch = formData.confirm_password === '' || formData.password === formData.confirm_password;
  const canSubmit      = formData.username && formData.password && formData.confirm_password && passwordsMatch;
  const inputStyle     = { width: '100%' } as React.CSSProperties;

  const stepLabels = ['Identity', 'Encryption Keys', 'Verify Email'];

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glows */}
      <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '320px', height: '320px', borderRadius: '50%', background: 'rgba(220,61,34,0.05)', filter: 'blur(90px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-80px', left: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(247,154,50,0.05)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '380px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', marginBottom: '1rem' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'linear-gradient(135deg,#f79a32,#dc3d22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.875rem' }}>A</div>
            <span style={{ color: '#d3af86', fontWeight: 700, fontSize: '0.9375rem' }}>AIM</span>
          </Link>
          <h1 style={{ fontSize: '1.375rem', marginBottom: '0.2rem' }}>Create account</h1>
          <p style={{ fontSize: '0.8rem', color: '#8a7359' }}>No real name required. Ever.</p>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ flex: 1, height: '3px', borderRadius: '999px', background: step >= s ? 'linear-gradient(90deg,#f79a32,#dc3d22)' : '#3c2818', transition: 'all 0.3s ease' }} />
          ))}
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '1.5rem' }}>
          {(error) && (
            <div role="alert" style={{ marginBottom: '1rem', background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', color: '#f2704a', borderRadius: '7px', padding: '0.6rem 0.875rem', fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          {/* ── Step 1: Identity ─────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.7rem', color: '#8a7359', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 1 — Identity
              </p>

              {/* Username */}
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>Username</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input id="username" name="username" type="text" required value={formData.username} onChange={handleChange} placeholder="your_anon_handle" style={{ flex: 1 }} />
                  <button
                    type="button" onClick={handleGenerateUsername} disabled={generatingUsername}
                    style={{ padding: '0.45rem 0.75rem', borderRadius: '7px', background: '#3c2818', border: '1px solid #4b3422', color: '#c0a472', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: generatingUsername ? 0.6 : 1 }}
                  >
                    {generatingUsername ? '…' : '🎲 Gen'}
                  </button>
                </div>
              </div>

              {/* User Type */}
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>Account Type</label>
                <select
                  name="user_type" value={formData.user_type} onChange={handleChange}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: '7px', background: '#3c2818', border: '1px solid #4b3422', color: '#d3af86', fontSize: '0.8rem' }}
                >
                  <option value="buyer">🛒 Buyer — Purchase digital content</option>
                  <option value="seller">💼 Seller — Create and sell listings</option>
                </select>
              </div>

              {/* Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={handleChange} placeholder="••••••••" style={{ ...inputStyle, paddingRight: '2.5rem' }} />
                  <button type="button" onClick={() => setShowPassword(p => !p)} style={{ position: 'absolute', right: '0.6rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#8a7359' }} tabIndex={-1}>
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>Confirm Password</label>
                <input id="confirm_password" name="confirm_password" type="password" required value={formData.confirm_password} onChange={handleChange} placeholder="••••••••"
                  style={{ ...inputStyle, borderColor: !passwordsMatch ? 'rgba(220,61,34,0.6)' : undefined }} />
                {!passwordsMatch && <p style={{ fontSize: '0.725rem', color: '#dc3d22', marginTop: '0.3rem' }}>Passwords don't match</p>}
              </div>

              {/* Optional Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.775rem', fontWeight: 600, color: '#8a7359', marginBottom: '0.4rem' }}>
                  Email <span style={{ fontWeight: 400, color: '#5c4228' }}>(optional — for account recovery)</span>
                </label>
                <input
                  id="email" name="email" type="email" value={formData.email} onChange={handleChange}
                  placeholder="anonymous@protonmail.com"
                  style={inputStyle}
                />
                {formData.email && (
                  <p style={{ fontSize: '0.7rem', color: '#39adb5', marginTop: '0.3rem' }}>
                    📧 A verification code will be sent to this address
                  </p>
                )}
              </div>

              <button
                type="button" onClick={() => setStep(2)}
                disabled={!formData.username || !formData.password || !passwordsMatch || !formData.confirm_password}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: (!formData.username || !formData.password || !passwordsMatch || !formData.confirm_password) ? 0.5 : 1 }}
              >
                Next: Encryption Keys →
              </button>
            </div>
          )}

          {/* ── Step 2: Keys ─────────────────────────────────────── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.7rem', color: '#8a7359', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 2 — Encryption Keys
              </p>

              <div style={{ background: 'rgba(57,173,181,0.08)', border: '1px solid rgba(57,173,181,0.2)', borderRadius: '7px', padding: '0.65rem 0.875rem', fontSize: '0.775rem', color: '#39adb5' }}>
                🔐 Your RSA-2048 keypair is generated <strong>locally in your browser</strong>. The private key never leaves your device.
              </div>

              {!keysGenerated ? (
                <button
                  type="button" onClick={handleGenerateKeys} disabled={generatingKeys} id="generate-keys-btn"
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '7px', background: '#3c2818', border: '1px solid #4b3422', color: '#d3af86', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', opacity: generatingKeys ? 0.7 : 1 }}
                >
                  {generatingKeys
                    ? <><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />Generating RSA-2048 keypair…</>
                    : '🗝️ Generate Encryption Keys'}
                </button>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(136,155,74,0.1)', border: '1px solid rgba(136,155,74,0.25)', borderRadius: '7px', padding: '0.5rem 0.75rem' }}>
                    <svg style={{ width: '14px', height: '14px', color: '#889b4a', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span style={{ fontSize: '0.775rem', color: '#a0b85e' }}>RSA-2048 keypair generated in browser</span>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#8a7359', marginBottom: '0.3rem' }}>Public Key (shared with buyers)</label>
                    <textarea rows={3} value={formData.public_key} readOnly
                      style={{ width: '100%', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.6rem', resize: 'none', color: '#8a7359' }} />
                  </div>

                  {!privateKeyDownloaded ? (
                    <button type="button" onClick={downloadPrivateKey}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '7px', background: 'rgba(247,154,50,0.1)', border: '1px solid rgba(247,154,50,0.25)', color: '#f79a32', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                      ⬇️ Download Private Key (.pem)
                    </button>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(247,154,50,0.08)', border: '1px solid rgba(247,154,50,0.2)', borderRadius: '7px', padding: '0.5rem 0.75rem' }}>
                      <span style={{ fontSize: '0.775rem', color: '#f79a32' }}>✅ Private key downloaded — store it safely!</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button type="button" onClick={() => setStep(1)}
                  style={{ flex: 1, padding: '0.55rem', borderRadius: '7px', background: '#3c2818', border: '1px solid #4b3422', color: '#c0a472', fontSize: '0.8rem', cursor: 'pointer' }}>
                  ← Back
                </button>
                <button type="submit" id="register-submit-btn" disabled={isLoading || !keysGenerated || !canSubmit}
                  className="btn btn-primary"
                  style={{ flex: 2, justifyContent: 'center', opacity: (isLoading || !keysGenerated || !canSubmit) ? 0.5 : 1 }}>
                  {isLoading
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} />Creating…</span>
                    : formData.email ? '🚀 Create & Verify Email' : '🚀 Create Account'}
                </button>
              </div>
            </form>
          )}

          {/* ── Step 3: OTP Verification ─────────────────────────── */}
          {step === 3 && (
            <form onSubmit={handleVerifyOTP} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <p style={{ fontSize: '0.7rem', color: '#8a7359', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Step 3 — Verify Email
              </p>

              <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📬</div>
                <p style={{ fontSize: '0.85rem', color: '#c0a472', marginBottom: '0.3rem' }}>
                  Code sent to <strong>{formData.email}</strong>
                </p>
                <p style={{ fontSize: '0.775rem', color: '#8a7359' }}>
                  Enter the 6-digit code below. Expires in 10 minutes.
                </p>
              </div>

              {otpError && (
                <div style={{ background: 'rgba(220,61,34,0.1)', border: '1px solid rgba(220,61,34,0.25)', color: '#f2704a', borderRadius: '7px', padding: '0.6rem 0.875rem', fontSize: '0.8rem' }}>
                  ⚠️ {otpError}
                </div>
              )}

              {/* OTP input */}
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="• • • • • •"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  letterSpacing: '0.5em',
                  fontFamily: 'JetBrains Mono, monospace',
                  padding: '0.75rem',
                }}
                autoFocus
              />

              <button
                type="submit"
                id="otp-verify-btn"
                disabled={otp.length !== 6 || otpLoading}
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', opacity: (otp.length !== 6 || otpLoading) ? 0.5 : 1 }}
              >
                {otpLoading
                  ? <><span className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Verifying…</>
                  : '✓ Verify & Enter'}
              </button>

              {/* Resend */}
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={resendCooldown > 0}
                  style={{ background: 'none', border: 'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', color: resendCooldown > 0 ? '#5c4228' : '#f79a32', fontSize: '0.775rem', fontWeight: 600 }}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                </button>
              </div>

              {/* Skip */}
              <button
                type="button"
                onClick={() => router.push(formData.user_type === 'seller' ? '/dashboard' : '/listings')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5c4228', fontSize: '0.75rem', textAlign: 'center' }}
              >
                Skip for now →
              </button>
            </form>
          )}

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(75,52,34,0.4)', textAlign: 'center' }}>
            <p style={{ fontSize: '0.775rem', color: '#8a7359' }}>
              Already registered?{' '}
              <Link href="/login" style={{ color: '#f79a32', fontWeight: 600 }}>Sign in</Link>
            </p>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.725rem', color: '#5c4228', marginTop: '1rem' }}>
          🛡️ No email · No phone · No real name required
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="spinner" style={{ width: '28px', height: '28px' }} /></main>}>
      <RegisterPageInner />
    </Suspense>
  );
}
