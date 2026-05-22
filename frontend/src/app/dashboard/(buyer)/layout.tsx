'use client';

import {
  LayoutDashboard,
  Search,
  Shield,
  Wallet,
  Bell,
  MessageSquareLock,
  Target,
  AlertTriangle,
  Activity,
  PlusCircle,
} from 'lucide-react';
import Link from 'next/link';
import { RoleDashboardShell } from '@/components/layouts/role-dashboard-shell';
import { useRequireRole } from '@/hooks/useRequireRole';
import { Button } from '@/components/ui/button';

export default function BuyerDashboardGroupLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('buyer');

  return (
    <RoleDashboardShell
      logoSubtitle="Buyer Command"
      hubHref="/dashboard/buyer"
      activeClassName="data-[active=true]:bg-cyan-500/10 data-[active=true]:text-cyan-400"
      navItems={[
        { title: 'Command Center', href: '/dashboard/buyer', icon: LayoutDashboard },
        { title: 'Marketplace', href: '/listings', icon: Search },
        { title: 'Escrow', href: '/dashboard/buyer/escrow', icon: Shield },
        { title: 'Wallet', href: '/dashboard/buyer/wallet', icon: Wallet },
        { title: 'Secure Comms', href: '/dashboard/buyer/secure-comms', icon: MessageSquareLock },
        { title: 'Bounties', href: '/bounties', icon: Target },
        { title: 'Reports', href: '/dashboard/buyer/reports', icon: AlertTriangle },
        { title: 'Notifications', href: '/dashboard/buyer/notifications', icon: Bell },
        { title: 'Activity', href: '/dashboard/buyer/activity', icon: Activity },
      ]}
      headerAction={
        <Button size="sm" variant="outline" className="rounded-full border-cyan-500/30 text-cyan-400 font-bold hidden sm:flex" asChild>
          <Link href="/listings">
            <PlusCircle className="w-4 h-4 mr-2" />
            Browse
          </Link>
        </Button>
      }
    >
      {children}
    </RoleDashboardShell>
  );
}
