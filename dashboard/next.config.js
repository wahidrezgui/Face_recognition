/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  rewrites: async () => [
    {
      source: '/stream',
      destination: 'http://localhost:8000/stream',
    },
    {
      source: '/vision/:path*',
      destination: 'http://localhost:8000/:path*',
    },
    {
      source: '/api/:path*',
      destination: 'http://localhost:5000/api/:path*',
    },
  ],
};

module.exports = nextConfig;
