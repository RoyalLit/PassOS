import type { NextConfig } from 'next';
import path from 'path';

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
