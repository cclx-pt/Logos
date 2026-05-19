import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Avatares Google (via Supabase Auth, user_metadata.avatar_url).
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
  },
  experimental: {
    // Default Next.js é 1 MB — bloqueia upload de PDFs em createLessonAction.
    // Schema da PR2 (storage.buckets.lesson-pdfs) permite até 20 MB; aqui
    // damos buffer para o resto do FormData (campos texto + headers).
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
};

export default nextConfig;
