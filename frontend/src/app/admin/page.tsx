'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminRoot() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/admin/login'); return; }
    if (!user?.is_staff) { router.replace('/dashboard'); return; }
    router.replace('/admin/dashboard');
  }, [isAuthenticated, user]);

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#8a7359', fontSize: '0.875rem' }}>
        <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
        Loading admin panel…
      </div>
    </main>
  );
}
