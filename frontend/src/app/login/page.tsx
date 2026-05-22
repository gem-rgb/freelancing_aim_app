'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLoginDashboardPath } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [localError, setLocalError]       = useState('');
  const { login, error: authError, clearError, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const error = localError || authError;

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      router.replace(getPostLoginDashboardPath(user));
    }
  }, [authLoading, isAuthenticated, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearError();
    setLocalError('');
    try {
      const loggedInUser = await login(username, password);
      router.replace(getPostLoginDashboardPath(loggedInUser));
    } catch (err: any) {
      const data = err.response?.data;
      if (err.response?.status === 403 && data?.detail) {
        setLocalError(data.detail);
      }
    }
    finally { setIsLoading(false); }
  };

  if (authLoading) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Resuming Protocol Session...</p>
    </div>
  );

  if (isAuthenticated) return null;

  return (
    <main className="min-h-screen flex items-center justify-center p-6 pt-32 relative overflow-hidden bg-background">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-[400px] space-y-8 relative z-10 animate-fade-in">
        {/* Brand */}
        <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-blue-500/20 group-hover:scale-110 transition-transform">A</div>
                <span className="text-2xl font-black text-white tracking-tighter">AIM</span>
            </Link>
            <h1 className="text-3xl font-black text-white tracking-tight mt-6">Welcome Back</h1>
            <p className="text-muted-foreground font-medium">Access your anonymous intelligence node</p>
        </div>

        <Card className="glass border-white/5 shadow-2xl shadow-black/50 overflow-hidden">
          <CardHeader className="space-y-1 p-8 pb-4">
            <CardTitle className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em]">Authentication</CardTitle>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold animate-in slide-in-from-top-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Codename</label>
                <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                        id="username"
                        placeholder="your_anon_handle"
                        value={username}
                        onChange={e => { setUsername(e.target.value); clearError(); }}
                        className="h-12 pl-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 text-white font-bold"
                    />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">Access Phrase</label>
                <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-blue-500 transition-colors" />
                    <Input 
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => { setPassword(e.target.value); clearError(); }}
                        className="h-12 pl-12 pr-12 bg-white/5 border-white/10 rounded-xl focus:border-blue-500/50 text-white font-bold"
                    />
                    <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white transition-colors"
                    >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                </div>
              </div>

              <Button 
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-14 rounded-2xl bg-blue-500 hover:bg-blue-600 font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-500/20 transition-all mt-4"
              >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Authorizing...
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        Resume Session <ArrowRight className="w-4 h-4" />
                    </div>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="p-8 pt-0 flex flex-col gap-6">
            <Separator className="bg-white/5" />
            <p className="text-xs text-muted-foreground font-medium text-center">
                New to the network? <Link href="/register" className="text-blue-500 font-black hover:underline underline-offset-4">Initialize Identity</Link>
            </p>
          </CardFooter>
        </Card>

        <div className="flex items-center justify-center gap-3 text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">
            <ShieldCheck className="w-3.5 h-3.5" />
            Zero-Knowledge Protocol Active
        </div>
      </div>
    </main>
  );
}
