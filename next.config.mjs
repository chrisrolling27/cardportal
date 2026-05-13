/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@adyen/adyen-platform-experience-web'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;