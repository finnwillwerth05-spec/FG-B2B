/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    '@fg/analysis',
    '@fg/auth',
    '@fg/database',
    '@fg/types',
    '@fg/ui',
    '@fg/voice',
  ],
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;
