import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@vitapeak/contracts', '@vitapeak/i18n'],
  async rewrites() {
    return [
      { source: '/auth/:path*', destination: `${API_ORIGIN}/auth/:path*` },
      { source: '/api/:path*', destination: `${API_ORIGIN}/api/:path*` },
    ];
  },
};

export default withNextIntl(nextConfig);
