import { Outlet, ScrollRestoration } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { Toaster } from '@/components/ui/Toast';
import { CookieConsentBanner } from '@/components/trust/CookieConsentBanner';

export function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <Toaster />
      <CookieConsentBanner />
      <ScrollRestoration />
    </div>
  );
}
