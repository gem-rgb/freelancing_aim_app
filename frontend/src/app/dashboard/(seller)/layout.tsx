'use client';

import {
  LayoutDashboard,
  Search,
  Package,
  PlusCircle,
  Shield,
  BarChart3,
  Radar,
  Coins,
  MessageSquare,
  Target,
} from 'lucide-react';
import Link from 'next/link';
import { RoleDashboardShell } from '@/components/layouts/role-dashboard-shell';
import { useRequireRole } from '@/hooks/useRequireRole';
import { Button } from '@/components/ui/button';

export default function SellerDashboardGroupLayout({ children }: { children: React.ReactNode }) {
  useRequireRole('seller');

  return (
    <RoleDashboardShell
      logoSubtitle="Seller Command"
      hubHref="/dashboard/seller"
      activeClassName="data-[active=true]:bg-blue-500/10 data-[active=true]:text-blue-500"
      navItems={[
        { title: 'Command Center', href: '/dashboard/seller', icon: LayoutDashboard },
        { title: 'Products', href: '/dashboard/seller/products', icon: Package },
        { title: 'New Listing', href: '/dashboard/create', icon: PlusCircle },
        { title: 'Escrow & stake', href: '/dashboard/seller/escrow-stake', icon: Shield },
        { title: 'Analytics', href: '/dashboard/seller/analytics', icon: BarChart3 },
        { title: 'Risk monitor', href: '/dashboard/seller/risk', icon: Radar },
        { title: 'Staking pool', href: '/dashboard/staking', icon: Coins },
        { title: 'Buy on AIM', href: '/listings', icon: Search },
        { title: 'Secure chat', href: '/chat', icon: MessageSquare },
        { title: 'Bounties', href: '/bounties', icon: Target },
      ]}
      headerAction={
        <Button size="sm" className="hidden sm:flex rounded-full bg-blue-500 hover:bg-blue-600 font-bold" asChild>
          <Link href="/dashboard/create">
            <PlusCircle className="w-4 h-4 mr-2" /> New listing
          </Link>
        </Button>
      }
    >
      {children}
    </RoleDashboardShell>
  );
}
