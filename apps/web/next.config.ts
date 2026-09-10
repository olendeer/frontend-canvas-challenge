import path from 'node:path';

import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  agentRules: false,
  devIndicators: false,
  reactStrictMode: true,
  sassOptions: {
    loadPaths: [path.join(import.meta.dirname, 'src/styles')],
  },
  transpilePackages: ['@canvas/contracts'],
};

export default nextConfig;
