import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Strip noisy console.* calls from production bundles. Next.js's SWC
  // compiler does this at build time when NODE_ENV === 'production'.
  // We keep `error` and `warn` because crash-reporting tools (Sentry,
  // Vercel Analytics, etc.) hook into those — silently dropping them
  // would hide real problems instead of capturing them. Dev / preview
  // builds keep all console output intact.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? { exclude: ['error', 'warn'] }
        : false,
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }

    // Fix Windows casing warnings (e.g. Desktop vs desktop in terminal CWD)
    // Resolve the project root with correct filesystem casing
    const resolvedRoot = path.resolve(__dirname);
    config.resolve = config.resolve || {};
    config.resolve.modules = [
      resolvedRoot,
      path.join(resolvedRoot, 'node_modules'),
      'node_modules',
      ...(config.resolve.modules || []),
    ];
    config.snapshot = {
      ...config.snapshot,
      managedPaths: [path.join(resolvedRoot, 'node_modules')],
    };

    return config;
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-XSS-Protection', value: '1; mode=block' },
      ],
    },
  ],
};

export default nextConfig;
