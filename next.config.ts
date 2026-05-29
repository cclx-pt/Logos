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
    // Smoothness pass V3.3 PR7 — fade automático entre rotas via
    // View Transitions API. Browsers sem suporte caem para navegação
    // instantânea (sem regressão). Activa o componente <ViewTransition>
    // do React 19 + crossfade default em `<Link>`s.
    viewTransition: true,
  },
};

export default nextConfig;
