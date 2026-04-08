import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  turbopack: {
    root: __dirname,
  },
  allowedDevOrigins: ['192.168.1.9', 'localhost:3000'],
  // Fix for the workspace root warning
  serverExternalPackages: [],
};

export default nextConfig;
