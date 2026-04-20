'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

export default function NavbarClient() {
  const { user, isAuthenticated, logout } = useAuth();
  const pathname  = usePathname();
  const router    = useRouter();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/');
    setOpen(false);
  };

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const isBuyer  = user?.user_type === 'buyer';
  const isSeller = user?.user_type === 'seller';
  const isStaff  = user?.is_staff;

  // ── Nav links differ by auth state & role ──
  // Public (not logged in): marketing links
  const publicLinks = [
    { href: '/listings', label: 'Marketplace' },
    { href: '/bounties',  label: 'Bounties'    },
    { href: '/features',  label: 'Features'    },
  ];

  // Buyer: marketplace + bounties only
  const buyerLinks = [
    { href: '/listings', label: 'Marketplace' },
    { href: '/bounties',  label: 'Bounties'    },
  ];

  // Seller: their listings + bounties (can fulfil bounties too)
  const sellerLinks = [
    { href: '/dashboard', label: 'My Listings'  },
    { href: '/bounties',   label: 'Bounties'    },
    { href: '/listings',   label: 'Browse'      },
  ];

  // Staff: everything
  const staffLinks = [
    { href: '/listings',         label: 'Marketplace' },
    { href: '/bounties',          label: 'Bounties'    },
    { href: '/admin/dashboard',   label: 'Admin'       },
  ];

  const navLinks = !isAuthenticated
    ? publicLinks
    : isStaff   ? staffLinks
    : isSeller  ? sellerLinks
    : buyerLinks;

  const mobileLinks = navLinks;

  const linkStyle = (href: string): React.CSSProperties => ({
    padding: '0.3rem 0.7rem',
    borderRadius: '5px',
    fontSize: '0.8rem',
    fontWeight: active(href) ? 600 : 500,
    color:      active(href) ? '#f79a32' : '#8a7359',
    background: active(href) ? 'rgba(247,154,50,0.1)' : 'transparent',
    border: '1px solid',
    borderColor: active(href) ? 'rgba(247,154,50,0.22)' : 'transparent',
    transition: 'all 0.15s ease',
    textDecoration: 'none',
  });

  return (
    <nav
      role="navigation"
      aria-label="Main navigation"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'rgba(34, 26, 15, 0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(75,52,34,0.5)',
      }}
    >
      <div className="container">
        <div style={{ display: 'flex', alignItems: 'center', height: '50px', gap: '1rem' }}>

          {/* ── Logo → dashboard if logged in ─────────────────── */}
          <Link
            href={isAuthenticated
              ? isStaff   ? '/admin/dashboard'
              : isSeller  ? '/dashboard/seller'
              : '/dashboard/buyer'
              : '/'}
            aria-label="AIM Marketplace — Home"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none', flexShrink: 0 }}
          >
            <div style={{
              width: '26px', height: '26px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #f79a32 0%, #dc3d22 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: '0.8125rem',
              flexShrink: 0,
            }}>
              A
            </div>
            <span style={{ color: '#d3af86', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '-0.01em' }}>
              AIM
            </span>
          </Link>

          {/* ── Divider ─────────────────────────────────────────── */}
          <div style={{ width: '1px', height: '18px', background: 'rgba(75,52,34,0.6)', flexShrink: 0 }} />

          {/* ── Nav links (desktop) ─────────────────────────────── */}
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', flex: 1 }}
            className="nav-desktop-links"
          >
            {navLinks.map(link => (
              <Link key={link.href} href={link.href} style={linkStyle(link.href)}>
                {link.label}
              </Link>
            ))}

            {/* Seller: quick "Create Listing" CTA in nav */}
            {isAuthenticated && isSeller && (
              <Link
                href="/dashboard/create"
                style={{
                  ...linkStyle('/dashboard/create'),
                  marginLeft: '0.25rem',
                  background: active('/dashboard/create') ? 'rgba(247,154,50,0.15)' : 'rgba(136,155,74,0.08)',
                  borderColor: active('/dashboard/create') ? 'rgba(247,154,50,0.3)' : 'rgba(136,155,74,0.25)',
                  color: active('/dashboard/create') ? '#f79a32' : '#a0b85e',
                }}
              >
                + New Listing
              </Link>
            )}
          </div>

          {/* ── Right side ──────────────────────────────────────── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginLeft: 'auto', flexShrink: 0 }}>
            {isAuthenticated ? (
              <>
                {/* Role badge */}
                {!isStaff && (
                  <span style={{
                    padding: '0.15rem 0.5rem',
                    borderRadius: '999px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    background: isSeller ? 'rgba(136,155,74,0.12)' : 'rgba(57,173,181,0.1)',
                    border: `1px solid ${isSeller ? 'rgba(136,155,74,0.3)' : 'rgba(57,173,181,0.25)'}`,
                    color: isSeller ? '#a0b85e' : '#39adb5',
                    letterSpacing: '0.03em',
                  }}>
                    {isSeller ? 'SELLER' : 'BUYER'}
                  </span>
                )}

                {/* Dashboard / avatar link */}
                <Link
                  href="/dashboard"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.45rem',
                    padding: '0.28rem 0.7rem',
                    borderRadius: '7px',
                    background: '#3c2818',
                    border: '1px solid #4b3422',
                    textDecoration: 'none',
                    fontSize: '0.775rem',
                    color: '#c0a472',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{
                    width: '18px', height: '18px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f79a32 0%, #dc3d22 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', fontWeight: 800, color: '#fff', flexShrink: 0,
                  }}>
                    {user?.username?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ maxWidth: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.username}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  aria-label="Sign out"
                  style={{
                    padding: '0.28rem 0.7rem',
                    borderRadius: '5px',
                    fontSize: '0.775rem',
                    fontWeight: 500,
                    color: '#8a7359',
                    background: 'transparent',
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  style={{
                    padding: '0.28rem 0.7rem',
                    borderRadius: '5px',
                    fontSize: '0.775rem',
                    fontWeight: 500,
                    color: '#8a7359',
                    background: 'transparent',
                    border: '1px solid transparent',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm">
                  Create account
                </Link>
              </>
            )}

            {/* ── Mobile toggle ──────────────────────────────── */}
            <button
              onClick={() => setOpen(!open)}
              aria-label="Toggle menu"
              aria-expanded={open}
              style={{
                padding: '0.35rem',
                borderRadius: '5px',
                color: '#8a7359',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
              }}
              className="nav-mobile-toggle"
            >
              <svg width="17" height="17" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* ── Mobile menu ─────────────────────────────────────────── */}
        {open && (
          <div style={{
            padding: '0.6rem 0 0.875rem',
            borderTop: '1px solid rgba(75,52,34,0.4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.2rem',
          }}>
            {mobileLinks.map(link => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.8125rem',
                  color: active(link.href) ? '#f79a32' : '#c0a472',
                  background: active(link.href) ? 'rgba(247,154,50,0.08)' : 'transparent',
                  textDecoration: 'none',
                }}
              >
                {link.label}
              </Link>
            ))}
            {isAuthenticated && isSeller && (
              <Link
                href="/dashboard/create"
                onClick={() => setOpen(false)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.8125rem',
                  color: '#a0b85e',
                  textDecoration: 'none',
                }}
              >
                + New Listing
              </Link>
            )}
            {isAuthenticated && (
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '5px',
                  fontSize: '0.8125rem',
                  color: active('/dashboard') ? '#f79a32' : '#c0a472',
                  textDecoration: 'none',
                }}
              >
                Dashboard
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 767px) {
          .nav-desktop-links { display: none !important; }
        }
        @media (min-width: 768px) {
          .nav-mobile-toggle { display: none !important; }
        }
      `}</style>

      <div className="sr-only" role="status" aria-live="polite">
        {isAuthenticated ? `Logged in as ${user?.username} (${user?.user_type})` : 'Not logged in'}
      </div>
    </nav>
  );
}
