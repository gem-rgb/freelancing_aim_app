'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Dashboard segment auth shell only.
 * Role-specific chrome (sidebars, nav) lives in `dashboard/(buyer|seller|manager)/layout.tsx`.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.add('aim-dashboard-shell');
    return () => document.body.classList.remove('aim-dashboard-shell');
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 bg-background">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Loading workspace…</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <div className="min-h-screen bg-background">{children}</div>;
}
