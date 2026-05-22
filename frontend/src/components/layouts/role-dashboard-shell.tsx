'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar as ShadcnSidebar,
  SidebarContent as ShadcnSidebarContent,
  SidebarHeader as ShadcnSidebarHeader,
  SidebarFooter as ShadcnSidebarFooter,
  SidebarGroup as ShadcnSidebarGroup,
  SidebarGroupLabel as ShadcnSidebarGroupLabel,
  SidebarGroupContent as ShadcnSidebarGroupContent,
  SidebarMenu as ShadcnSidebarMenu,
  SidebarMenuItem as ShadcnSidebarMenuItem,
  SidebarMenuButton as ShadcnSidebarMenuButton,
  SidebarProvider as ShadcnSidebarProvider,
  SidebarInset as ShadcnSidebarInset,
  SidebarTrigger as ShadcnSidebarTrigger,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export type RoleNavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  show?: boolean;
};

export type RoleDashboardShellProps = {
  /** Shown under AIM logo — e.g. "Buyer Command" */
  logoSubtitle: string;
  /** Primary hub link for the Settings shortcut row */
  hubHref: string;
  navItems: RoleNavItem[];
  /** Optional right side of top bar (e.g. New Listing) */
  headerAction?: React.ReactNode;
  /** Accent for active nav item */
  activeClassName?: string;
  children: React.ReactNode;
};

export function RoleDashboardShell({
  logoSubtitle,
  hubHref,
  navItems,
  headerAction,
  activeClassName = 'data-[active=true]:bg-blue-500/10 data-[active=true]:text-blue-500',
  children,
}: RoleDashboardShellProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const visible = navItems.filter((i) => i.show !== false);

  const titleFromPath = pathname
    .split('/')
    .filter(Boolean)
    .slice(2)
    .join(' / ')
    .replace(/-/g, ' ') || 'overview';

  return (
    <ShadcnSidebarProvider>
      <div className="flex min-h-screen bg-background w-full">
        <ShadcnSidebar collapsible="icon" className="border-r border-white/5 bg-sidebar">
          <ShadcnSidebarHeader className="p-4 border-b border-white/5">
            <Link href="/" className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-black text-xs">AIM</span>
              </div>
              <div className="group-data-[collapsible=icon]:hidden">
                <span className="font-bold text-lg tracking-tight text-white block leading-none">Marketplace</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400/90">{logoSubtitle}</span>
              </div>
            </Link>
          </ShadcnSidebarHeader>

          <ShadcnSidebarContent>
            <ShadcnSidebarGroup>
              <ShadcnSidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                Navigation
              </ShadcnSidebarGroupLabel>
              <ShadcnSidebarGroupContent>
                <ShadcnSidebarMenu>
                  {visible.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                    return (
                      <ShadcnSidebarMenuItem key={item.title}>
                        <ShadcnSidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={item.title}
                          className={cn('hover:bg-white/5 transition-colors py-5', activeClassName)}
                        >
                          <Link href={item.href}>
                            <item.icon className="w-5 h-5" />
                            <span className="font-bold">{item.title}</span>
                          </Link>
                        </ShadcnSidebarMenuButton>
                      </ShadcnSidebarMenuItem>
                    );
                  })}
                </ShadcnSidebarMenu>
              </ShadcnSidebarGroupContent>
            </ShadcnSidebarGroup>

            <ShadcnSidebarGroup className="mt-auto">
              <ShadcnSidebarGroupLabel className="px-4 text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                Account
              </ShadcnSidebarGroupLabel>
              <ShadcnSidebarGroupContent>
                <ShadcnSidebarMenu>
                  <ShadcnSidebarMenuItem>
                    <ShadcnSidebarMenuButton asChild tooltip="Command hub" className="hover:bg-white/5 py-5">
                      <Link href={hubHref}>
                        <Settings className="w-5 h-5" />
                        <span className="font-bold">Hub</span>
                      </Link>
                    </ShadcnSidebarMenuButton>
                  </ShadcnSidebarMenuItem>
                  <ShadcnSidebarMenuItem>
                    <ShadcnSidebarMenuButton
                      onClick={() => logout()}
                      tooltip="Logout"
                      className="hover:bg-red-500/10 hover:text-red-500 py-5 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-bold">Logout</span>
                    </ShadcnSidebarMenuButton>
                  </ShadcnSidebarMenuItem>
                </ShadcnSidebarMenu>
              </ShadcnSidebarGroupContent>
            </ShadcnSidebarGroup>
          </ShadcnSidebarContent>

          <ShadcnSidebarFooter className="p-4 border-t border-white/5 group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-white/5">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <span className="text-blue-500 font-bold text-xs">{user?.username?.[0]?.toUpperCase()}</span>
              </div>
              <div className="flex flex-col overflow-hidden min-w-0">
                <span className="text-sm font-bold truncate text-white">{user?.username}</span>
                <span className="text-[10px] uppercase text-muted-foreground font-black tracking-tighter truncate">
                  {user?.user_type}
                </span>
              </div>
            </div>
          </ShadcnSidebarFooter>
        </ShadcnSidebar>

        <ShadcnSidebarInset className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
          <header className="flex h-16 shrink-0 items-center gap-2 border-b border-white/5 px-4 sm:px-6 sticky top-0 bg-background/80 backdrop-blur-md z-30 justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <ShadcnSidebarTrigger className="-ml-1 text-muted-foreground hover:text-white shrink-0" />
              <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
              <h2 className="font-bold text-xs sm:text-sm text-muted-foreground tracking-tight uppercase truncate">
                {titleFromPath}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">{headerAction}</div>
          </header>
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">{children}</div>
          </div>
        </ShadcnSidebarInset>
      </div>
    </ShadcnSidebarProvider>
  );
}