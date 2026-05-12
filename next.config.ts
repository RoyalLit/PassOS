import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  allowedDevOrigins: ['192.168.1.3', '192.168.1.9', 'localhost:3000', 'localhost:3001'],
  serverExternalPackages: [],
};

export default nextConfig;
