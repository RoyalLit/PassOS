import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'gravatar.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=1, stale-while-revalidate=59' },
        ],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['192.168.1.3', '192.168.1.9', 'localhost:3000', 'localhost:3001'],
  serverExternalPackages: [],
};

export default nextConfig;
