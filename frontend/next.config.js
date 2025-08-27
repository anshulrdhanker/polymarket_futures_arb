/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3002/api/:path*', // Backend is running on port 3002
      },
    ];
  },
};

module.exports = nextConfig;
