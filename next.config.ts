import type { NextConfig } from 'next';

// Headers de seguranca aplicados a todas as rotas.
// Nota: NAO inclui uma Content-Security-Policy completa (de proposito) - uma CSP
// estrita precisa de afinar inline scripts do Next, Vercel Analytics, frame-src do
// YouTube (home + aulas V3), connect-src do Supabase e img-src do Google. Fica como
// follow-up dedicado para evitar partir paginas. Estes headers sao seguros e nao
// quebram nada. HSTS e tambem injectado pela Vercel no dominio custom; declaramo-lo
// aqui de forma explicita.
const securityHeaders = [
  // Impede o browser de adivinhar (sniff) o content-type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Anti-clickjacking: o site nao pode ser embebido por terceiros (protege o login).
  // Nao afecta os nossos proprios iframes a embeber o YouTube.
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  // Nao vazar o caminho completo de origem para sites externos.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Desliga APIs sensiveis que o site nao usa.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
  },
  // Forca HTTPS em visitas futuras (2 anos). includeSubDomains so afecta *.logos.cclx.pt.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
];

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
