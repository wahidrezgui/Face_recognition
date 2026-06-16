const DEV_IP = "10.39.72.22";
const API_URL = process.env.NEXT_PUBLIC_API_URL || `http://${DEV_IP}:5000`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  allowedDevOrigins: [DEV_IP],
  rewrites: async () => [
    {
      source: '/api/v1/:path*',
      destination: `${API_URL}/api/v1/:path*`,
    },
  ],
};

module.exports = nextConfig;
