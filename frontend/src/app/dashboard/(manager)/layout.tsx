'use client';

import {
  LayoutDashboard,
  UserCheck,
  ListChecks,
  Layers,
  MessageSquareLock,
  LineChart,
  Shield,
} from 'lucide-react';
import { RoleDashboardShell } from '@/components/layouts/role-dashboard-shell';
import { useRequireRole } from '@/hooks/useRequireRole';

export default function ManagerDashboardGroupLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('manager');

  return (
    <RoleDashboardShell
      logoSubtitle="Manager Operations"
      hubHref="/dashboard/manager"
      activeClassName="data-[active=true]:bg-violet-500/10 data-[active=true]:text-violet-300"
      navItems={[
        { title: 'Overview', href: '/dashboard/manager', icon: LayoutDashboard },
        { title: 'Onboarding', href: '/dashboard/manager/onboarding', icon: UserCheck },
        { title: 'Verification queue', href: '/dashboard/manager/verification-queue', icon: ListChecks },
        { title: 'Chunk assignments', href: '/dashboard/manager/assignments', icon: Layers },
        { title: 'Internal comms', href: '/dashboard/manager/internal-comms', icon: MessageSquareLock },
        { title: 'Performance', href: '/dashboard/manager/performance', icon: LineChart },
        { title: 'Trust & policy', href: '/dashboard/manager/trust', icon: Shield },
      ]}
    >
      {children}
    </RoleDashboardShell>
  );
}
