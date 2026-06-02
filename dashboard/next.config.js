const DEV_IP = "10.39.72.22";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [DEV_IP],
  rewrites: async () => [
    {
      source: '/stream',
      destination: `http://${DEV_IP}:8000/stream`,
    },
    {
      source: '/stream/:gateId',
      destination: `http://${DEV_IP}:8000/stream`,
    },
    {
      source: '/vision/:path*',
      destination: `http://${DEV_IP}:8000/:path*`,
    },
    {
      source: '/api/:path*',
      destination: `http://${DEV_IP}:5000/api/:path*`,
    },
  ],
};

module.exports = nextConfig;
