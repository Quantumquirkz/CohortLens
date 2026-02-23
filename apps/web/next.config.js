/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@cohortlens/ui', '@cohortlens/config', '@cohortlens/types'],
};

module.exports = nextConfig;
