import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.1.9', 'localhost:3000'],
  // Fix for the workspace root warning
  serverExternalPackages: [],
  async redirects() {
    return [
      {
        source: '/login',
        destination: '/?login=true',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
