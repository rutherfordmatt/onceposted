/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: false,
  },
  serverExternalPackages: ['sharp'],
}

export default nextConfig;
