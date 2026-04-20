'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Route based on user type
    if (user?.user_type === 'buyer') {
      router.replace('/dashboard/buyer');
    } else if (user?.user_type === 'seller') {
      router.replace('/dashboard/seller');
    } else if (user?.is_staff) {
      router.replace('/admin/dashboard');
    } else {
      // Fallback to buyer if no user_type is set
      router.replace('/dashboard/buyer');
    }
  }, [isAuthenticated, user, router]);

  // Show loading while redirecting
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" style={{ width: '36px', height: '36px' }} />
    </div>
  );
}
