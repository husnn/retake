/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    transpilePackages: ['@retake/shared']
  },
  compiler: {
    styledComponents: true
  }
}

module.exports = nextConfig
