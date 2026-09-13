/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {},
  async rewrites() {
    return [
      {
        source: '/v1/:path*',
        destination: '/api/:path*',
      },
    ];
  }
};

export default nextConfig;
