import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import NavbarClient from '@/components/NavbarClient';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AIM — Anonymous Information Marketplace',
  description: 'Buy & sell verified earning strategies, end-to-end encrypted, escrow-protected.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className={`${inter.className} antialiased selection:bg-blue-500/30 selection:text-white`}>
        <AuthProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:font-bold">
            Skip to main content
          </a>
          
          <NavbarClient />
          
          <main id="main-content">
            {children}
          </main>

          <footer className="bg-[#050505] border-t border-white/5 py-12 group-[.is-dashboard]:hidden">
            <div className="container mx-auto px-4">
              <div className="grid md:grid-cols-4 gap-12 mb-12">
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <span className="text-white font-black text-sm">AIM</span>
                    </div>
                    <span className="text-xl font-black text-white tracking-tight uppercase">Marketplace</span>
                  </div>
                  <p className="text-muted-foreground text-sm max-w-sm leading-relaxed">
                    The premier anonymous exchange for verified earning intelligence. All content is encrypted end-to-end before it ever leaves your browser.
                  </p>
                </div>
                <div>
                  <h4 className="text-white font-black uppercase text-[10px] tracking-widest mb-6">Network</h4>
                  <ul className="space-y-4">
                    <li><Link href="/listings" className="text-muted-foreground hover:text-blue-400 transition-colors text-sm font-bold">Marketplace</Link></li>
                    <li><Link href="/bounties" className="text-muted-foreground hover:text-blue-400 transition-colors text-sm font-bold">Bounty Board</Link></li>
                    <li><Link href="/features" className="text-muted-foreground hover:text-blue-400 transition-colors text-sm font-bold">Technology</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-black uppercase text-[10px] tracking-widest mb-6">Governance</h4>
                  <ul className="space-y-4">
                    <li><Link href="/terms" className="text-muted-foreground hover:text-blue-400 transition-colors text-sm font-bold">Terms of Service</Link></li>
                    <li><Link href="/privacy" className="text-muted-foreground hover:text-blue-400 transition-colors text-sm font-bold">Privacy Protocol</Link></li>
                    <li><Link href="/disputes" className="text-muted-foreground hover:text-blue-400 transition-colors text-sm font-bold">Dispute Resolution</Link></li>
                  </ul>
                </div>
              </div>
              <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  © 2026 AIM Marketplace Protocol · Distributed & Encrypted
                </p>
                <div className="flex gap-6">
                  <span className="text-[10px] font-black text-blue-400 uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    Network Status: Operational
                  </span>
                </div>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
