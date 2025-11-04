/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['fal.media', 'supabase.co'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.fal.media',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000, // Check for changes every second
        aggregateTimeout: 300, // Delay before rebuilding
      };
    }
    // Exclude Paper.js from server-side bundle (it's browser-only)
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('paper');
    }
    return config;
  },
}

module.exports = nextConfig
