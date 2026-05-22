'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Menu, 
  X, 
  ChevronRight, 
  LayoutDashboard, 
  LogOut,
  ShoppingBag,
  Target,
  Cpu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getPostLoginDashboardPath } from '@/lib/rbac';

export default function NavbarClient() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const dashboardHref = isAuthenticated && user ? getPostLoginDashboardPath(user) : '/dashboard';

  // Hide navbar in dashboard routes
  const isDashboard = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setOpen(false);
  };

  if (isDashboard) return null;

  const publicLinks = [
    { href: '/listings', label: 'Marketplace', icon: ShoppingBag },
    { href: '/bounties', label: 'Bounties', icon: Target },
    { href: '/features', label: 'Technology', icon: Cpu },
  ];

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-[100] transition-all duration-300 border-b",
        scrolled 
          ? "bg-black/80 backdrop-blur-xl border-white/5 py-3" 
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <span className="text-white font-black text-sm">AIM</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-black text-lg tracking-tighter uppercase leading-none">Marketplace</span>
            <span className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] leading-none mt-1">E2EE Protocol</span>
          </div>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          {publicLinks.map((link) => (
            <Link 
              key={link.href} 
              href={link.href}
              className={cn(
                "text-sm font-bold transition-colors hover:text-blue-400",
                pathname === link.href ? "text-blue-400" : "text-slate-400"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <Button variant="ghost" className="hidden lg:flex font-bold text-slate-400 hover:text-white" asChild>
                <Link href={dashboardHref}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button className="rounded-full bg-white text-black font-black hover:bg-gray-200" asChild>
                <Link href={dashboardHref}>
                  Account <ChevronRight className="w-4 h-4 ml-1" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" className="hidden sm:flex font-bold text-slate-400 hover:text-white" asChild>
                <Link href="/login">Sign In</Link>
              </Button>
              <Button className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-6" asChild>
                <Link href="/register">Join AIM</Link>
              </Button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden text-white p-2"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden absolute top-full left-0 w-full bg-[#050505]/95 backdrop-blur-2xl border-b border-white/5 p-6 animate-in slide-in-from-top duration-300">
          <div className="flex flex-col gap-6">
            {publicLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-2xl font-black text-white hover:text-blue-400 transition-colors"
              >
                {link.label}
              </Link>
            ))}
            <div className="h-[1px] bg-white/5 my-2" />
            {isAuthenticated ? (
              <>
                <Link href={dashboardHref} className="text-xl font-bold text-white flex items-center gap-2">
                  <LayoutDashboard className="w-5 h-5 text-blue-500" /> Dashboard
                </Link>
                <button onClick={handleLogout} className="text-xl font-bold text-red-500 flex items-center gap-2">
                  <LogOut className="w-5 h-5" /> Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-4">
                <Button className="w-full h-14 rounded-2xl bg-blue-600 font-bold" asChild>
                  <Link href="/register">Create Account</Link>
                </Button>
                <Button variant="outline" className="w-full h-14 rounded-2xl border-white/10 font-bold" asChild>
                  <Link href="/login">Sign In</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
