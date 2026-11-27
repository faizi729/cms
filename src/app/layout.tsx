import { ReactNode } from 'react';
import { Space_Grotesk } from 'next/font/google';
import { cn } from '@/lib/utils';
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { siteConfig } from '@/config/site-config';
import { Toaster } from 'sonner';
import { Navbar } from '@/components/Navbar';
import NextTopLoader from 'nextjs-toploader';
import OfflineNotification from '@/components/OfflineNavigator';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = siteConfig;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning={true} lang="en">
      <body
        suppressHydrationWarning={true}
        className={cn(
          'min-h-screen bg-background font-space-grotesk antialiased',
          spaceGrotesk.variable,
        )}
      >
        <GoogleAnalytics />
        <NextTopLoader
          color="#6C38FF"
          showSpinner={false}
        />
        <Providers>
          <Navbar />
          <OfflineNotification />
          {children}
          <Toaster richColors />
        </Providers>
      </body>
    </html>
  );
}
