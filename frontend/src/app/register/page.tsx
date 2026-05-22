'use client';

import { Suspense, useState, useCallback, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { EncryptionService } from '@/utils/encryption';
import { apiService } from '@/utils/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  Lock, 
  Key, 
  Download, 
  ArrowRight, 
  ArrowLeft, 
  User, 
  Mail, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  Dices,
  Cpu,
  RefreshCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPostLoginDashboardPath } from '@/lib/rbac';

function RegisterPageInner() {
  const searchParams    = useSearchParams();
  const roleParam       = searchParams.get('role');
  const defaultRole     = (roleParam === 'seller' ? 'seller' : roleParam === 'manager' ? 'manager' : 'buyer') as 'buyer' | 'seller' | 'manager';

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
      await new Promise(r => setTimeout(r, 800)); // Visual pause for "heavy" operation
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
        router.push(getPostLoginDashboardPath({ user_type: formData.user_type, is_staff: false }));
      }
    } catch { }
    finally { setIsLoading(false); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpLoading(true); setOtpError('');
    try {
      await apiService.verifyOTP(otp);
      router.push(getPostLoginDashboardPath({ user_type: formData.user_type, is_staff: false }));
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

  return (
    <main className="min-h-screen flex items-center justify-center p-6 pt-32 relative overflow-hidden bg-background">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-[420px] space-y-8 relative z-10 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">A</div>
                <span className="text-2xl font-black text-white tracking-tighter">AIM</span>
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tight mt-6">Protocol Initialize</h1>
            <p className="text-muted-foreground font-medium">Generate your distributed marketplace identity</p>
        </div>

        {/* Step Indicator */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-full">
            {[1, 2, 3].map(s => (
                <div key={s} className={cn(
                    "h-1.5 flex-1 rounded-full transition-all duration-500",
                    s <= step ? "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/20" : "bg-white/10"
                )} />
            ))}
        </div>

        <Card className="glass border-white/5 shadow-2xl shadow-black/50 overflow-hidden">
          <CardContent className="p-8 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Step 1: Identity */}
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Identity Codename</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1 group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                    <Input 
                                        name="username"
                                        placeholder="your_anon_handle"
                                        value={formData.username}
                                        onChange={handleChange}
                                        className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 text-white font-bold"
                                    />
                                </div>
                                <Button 
                                    variant="outline" 
                                    className="h-12 w-12 rounded-xl border-white/10 hover:bg-white/5 p-0"
                                    onClick={handleGenerateUsername}
                                    disabled={generatingUsername}
                                >
                                    <Dices className={cn("w-5 h-5 text-blue-500", generatingUsername && "animate-spin")} />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Protocol Role</label>
                            <select 
                                name="user_type"
                                value={formData.user_type}
                                onChange={handleChange}
                                className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-white font-bold appearance-none focus:outline-none focus:border-blue-500/50"
                            >
                                <option value="buyer" className="bg-slate-900">🛒 Buyer — Acquire Assets</option>
                                <option value="seller" className="bg-slate-900">💼 Seller — Deploy Assets</option>
                                <option value="manager" className="bg-slate-900">🛡️ Manager — Verification ops</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Security Phrase</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="h-12 pl-12 pr-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 text-white font-bold"
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Confirm Phrase</label>
                            <Input 
                                name="confirm_password"
                                type="password"
                                placeholder="••••••••"
                                value={formData.confirm_password}
                                onChange={handleChange}
                                className={cn(
                                    "h-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 text-white font-bold",
                                    !passwordsMatch && "border-red-500/50 focus:border-red-500"
                                )}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Recovery Node (Email)</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                                <Input 
                                    name="email"
                                    type="email"
                                    placeholder="Optional — for recovery"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 text-white font-bold"
                                />
                            </div>
                        </div>
                    </div>

                    <Button 
                        className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20"
                        onClick={() => setStep(2)}
                        disabled={!formData.username || !formData.password || !passwordsMatch || !formData.confirm_password}
                    >
                        Define Encryption Keys <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            )}

            {/* Step 2: Keys */}
            {step === 2 && (
                <div className="space-y-8 animate-in slide-in-from-right duration-500">
                    <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex gap-4 items-start">
                        <ShieldCheck className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                        <div className="space-y-1">
                            <p className="text-xs font-black text-blue-500 uppercase tracking-widest">Zero-Knowledge Cipher</p>
                            <p className="text-[10px] text-blue-500/80 font-bold leading-relaxed uppercase">RSA-2048 keys are generated locally. The private key never leaves your device.</p>
                        </div>
                    </div>

                    {!keysGenerated ? (
                        <div className="space-y-6">
                            <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto border border-white/10">
                                <Cpu className={cn("w-10 h-10 text-muted-foreground/30", generatingKeys && "animate-spin text-blue-500")} />
                            </div>
                            <Button 
                                className="w-full h-16 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest"
                                onClick={handleGenerateKeys}
                                disabled={generatingKeys}
                            >
                                {generatingKeys ? "Computing Prime Numbers..." : "Generate RSA Keypair"}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center gap-3">
                                <CheckCircle2 className="w-5 h-5 text-green-500" />
                                <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Asymmetric Cipher Ready</span>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Network Public Address</label>
                                <textarea 
                                    readOnly 
                                    value={formData.public_key}
                                    className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 text-[8px] font-mono text-muted-foreground resize-none focus:outline-none"
                                />
                            </div>

                            <div className="space-y-4">
                                {!privateKeyDownloaded ? (
                                    <Button 
                                        className="w-full h-16 rounded-2xl bg-blue-500 hover:bg-blue-600 text-white font-black uppercase text-xs tracking-[0.1em] shadow-xl shadow-blue-500/20"
                                        onClick={downloadPrivateKey}
                                    >
                                        <Download className="w-5 h-5 mr-3" /> Secure Download (.PEM)
                                    </Button>
                                ) : (
                                    <div className="p-6 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                                        <p className="text-xs font-black text-blue-500 uppercase tracking-widest mb-1">Key Captured Successfully</p>
                                        <p className="text-[9px] text-blue-500/60 font-bold uppercase tracking-widest">Store it offline. It cannot be recovered.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button variant="ghost" className="rounded-xl font-bold flex-1" onClick={() => setStep(1)}>Back</Button>
                        <Button 
                            className="rounded-xl bg-blue-500 hover:bg-blue-600 font-black flex-[2]" 
                            onClick={handleSubmit}
                            disabled={isLoading || !keysGenerated || !privateKeyDownloaded}
                        >
                            {isLoading ? "Broadcasting..." : "Finalize Registration"}
                        </Button>
                    </div>
                </div>
            )}

            {/* Step 3: OTP */}
            {step === 3 && (
                <div className="space-y-8 animate-in slide-in-from-right duration-500">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/20">
                            <Mail className="w-8 h-8 text-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="font-black text-white text-lg uppercase tracking-tight">Verify Node Connection</h3>
                            <p className="text-xs text-muted-foreground font-medium px-4">
                                A 6-digit verification sequence has been dispatched to <span className="text-white font-bold">{formData.email}</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <Input 
                            value={otp}
                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            className="h-20 text-center text-4xl font-black tracking-[0.5em] bg-white/5 border-white/10 rounded-2xl focus:border-blue-500/50 text-white"
                        />

                        <Button 
                            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20"
                            onClick={handleVerifyOTP}
                            disabled={otp.length !== 6 || otpLoading}
                        >
                            {otpLoading ? "Verifying..." : "Validate Node"}
                        </Button>

                        <div className="text-center space-y-4">
                            <button 
                                className="text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto"
                                onClick={handleResendOTP}
                                disabled={resendCooldown > 0}
                            >
                                <RefreshCcw className={cn("w-3 h-3", resendCooldown > 0 && "opacity-20")} />
                                {resendCooldown > 0 ? `Resend In ${resendCooldown}s` : "Resend Sequence"}
                            </button>
                            
                            <button 
                                className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest hover:text-white transition-colors block mx-auto"
                                onClick={() => router.push(getPostLoginDashboardPath({ user_type: formData.user_type, is_staff: false }))}
                            >
                                Skip Verification (Limited Access)
                            </button>
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
          <CardFooter className="p-8 pt-0 flex flex-col gap-6">
            <Separator className="bg-white/5" />
            <p className="text-xs text-muted-foreground font-medium text-center">
                Already registered? <Link href="/login" className="text-blue-500 font-black hover:underline underline-offset-4">Resume Session</Link>
            </p>
          </CardFooter>
        </Card>

        <p className="text-[10px] text-muted-foreground/30 font-black uppercase tracking-[0.2em] text-center">
            AIM — Distributed Intelligence Network
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageInner />
    </Suspense>
  );
}
