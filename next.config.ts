import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },  // avatars do Google
      { protocol: 'https', hostname: 'yt3.googleusercontent.com' },   // thumbnails de canais YouTube
      { protocol: 'https', hostname: 'i.ytimg.com' },                 // thumbnails de vídeos YouTube
      { protocol: 'https', hostname: 'yt3.ggpht.com' },               // thumbnails alternativos YouTube
    ],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
