import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'PassOS | Smart Gate Pass System',
  description: 'Production-grade campus access control and student mobility system',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gray-50 text-slate-900 flex flex-col`}>
        <main className="flex-1">
          {children}
        </main>
        <footer className="py-6 border-t bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-xs font-medium text-slate-400 tracking-widest uppercase">
              built with purpose by pahul
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
