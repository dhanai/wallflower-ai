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
}

module.exports = nextConfig
