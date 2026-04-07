import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PassOS | Smart Gate Pass System',
  description: 'Production-grade campus access control and student mobility system',
};

import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-background text-foreground flex flex-col transition-colors duration-300`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
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
        </ThemeProvider>
      </body>
    </html>
  );
}
