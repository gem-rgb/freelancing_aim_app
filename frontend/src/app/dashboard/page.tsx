'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getPostLoginDashboardPath } from '@/lib/rbac';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    router.replace(getPostLoginDashboardPath(user ?? undefined));
  }, [isAuthenticated, user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-9 h-9 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
