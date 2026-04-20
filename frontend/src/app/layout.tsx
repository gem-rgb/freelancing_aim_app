import type { Metadata } from 'next';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import NavbarClient from '@/components/NavbarClient';

export const metadata: Metadata = {
  title: 'AIM — Anonymous Information Marketplace',
  description: 'Buy & sell verified earning strategies, end-to-end encrypted, escrow-protected.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AuthProvider>
          <a href="#main-content" className="skip-link">Skip to main content</a>
          <header>
            <NavbarClient />
          </header>
          <main id="main-content">
            {children}
          </main>
          <footer
            role="contentinfo"
            style={{
              borderTop: '1px solid rgba(75,52,34,0.45)',
              background: '#221a0f',
              padding: '1.25rem 0',
              marginTop: 'auto',
            }}
          >
            <div className="container" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '18px', height: '18px', borderRadius: '5px',
                  background: 'linear-gradient(135deg,#f79a32,#dc3d22)',
                }} aria-hidden="true" />
                <span style={{ fontSize: '0.8rem', color: '#5c4228', fontWeight: 600 }}>AIM Marketplace</span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#5c4228' }}>
                All content encrypted end-to-end · Escrow-protected · Anonymous by design
              </p>
              <nav aria-label="Footer navigation" style={{ display: 'flex', gap: '1rem' }}>
                <a href="/listings" style={{ fontSize: '0.75rem', color: '#8a7359', textDecoration: 'none' }}>Marketplace</a>
                <a href="/bounties" style={{ fontSize: '0.75rem', color: '#8a7359', textDecoration: 'none' }}>Bounties</a>
              </nav>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
