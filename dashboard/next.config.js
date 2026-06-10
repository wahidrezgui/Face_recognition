const DEV_IP = "10.39.72.22";
const VISION_URL = process.env.VISION_SERVICE_URL || `http://${DEV_IP}:8001`;
const API_URL = process.env.NEXT_PUBLIC_API_URL || `http://${DEV_IP}:5000`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [DEV_IP],
  rewrites: async () => [
    {
      source: '/stream',
      destination: `${VISION_URL}/stream`,
    },
    {
      source: '/stream/:gateId',
      destination: `${VISION_URL}/stream`,
    },
    {
      source: '/vision/:path*',
      destination: `${VISION_URL}/:path*`,
    },
    {
      source: '/api/:path*',
      destination: `${API_URL}/api/:path*`,
    },
  ],
};

module.exports = nextConfig;
