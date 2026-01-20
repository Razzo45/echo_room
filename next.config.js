/** @type {import('next').NextConfig} */
const isVercel = process.env.VERCEL === '1';

const withPWA = require('next-pwa')({
  dest: 'public',
  // Disable PWA on Vercel for now to avoid build issues
  disable: isVercel || process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  buildExcludes: [/middleware-manifest\.json$/],
});

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

module.exports = withPWA(nextConfig);
