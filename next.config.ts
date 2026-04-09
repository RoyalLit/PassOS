import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.1.9', 'localhost:3000'],
  serverExternalPackages: [],
};

export default nextConfig;
