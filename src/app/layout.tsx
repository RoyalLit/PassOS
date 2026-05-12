/**
 * ---------------------------------------------------------------------------
 * PassOS | Smart Gate Pass System
 * Built with purpose by Pahul
 * 
 * This source code is the intellectual property of the author.
 * © 2026 Pahul. All rights reserved.
 * ---------------------------------------------------------------------------
 */

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false, // Skip fetch to avoid build errors
});
// Fallback: if Google Fonts fetch fails, use system fonts
// const inter = { className: 'font-sans', variable: '--font-inter' };

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'PassOS | Smart Gate Pass System',
  description: 'Production-grade campus access control and student mobility system',
  authors: [{ name: 'Pahul' }],
  creator: 'Pahul',
  publisher: 'Pahul',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PassOS',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'PassOS',
    title: 'PassOS | Smart Gate Pass System',
    description: 'Production-grade campus access control and student mobility system',
  },
};

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from 'sonner';
import { getCurrentUser } from '@/lib/auth/rbac';
import { BrandingProvider } from '@/components/layout/branding-provider';
import { PushNotificationProvider } from '@/hooks/use-push-notifications';

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `console.log("%c[PassOS] Built with purpose by Pahul", "color: #2563eb; font-weight: bold; font-size: 1.2em;");`
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <BrandingProvider tenant={user?.tenant}>
            <PushNotificationProvider>
              <main className="flex-1">
                {children}
              </main>
              <footer className="py-6 border-t border-border bg-card/50 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto px-4 text-center">
                  <p className="text-xs font-medium text-muted-foreground tracking-widest uppercase">
                    built with purpose by pahul
                  </p>
                </div>
              </footer>
              <Toaster position="top-center" richColors expand={true} />
            </PushNotificationProvider>
          </BrandingProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
