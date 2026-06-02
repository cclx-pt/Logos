import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

// Content-Security-Policy (enforcing). Pragmatica, nao baseada em nonce:
// - script-src/style-src usam 'unsafe-inline' porque o Next injecta scripts/estilos
//   inline para hidratacao e o RSC payload (sem nonce nao ha alternativa). Mesmo
//   assim, as restantes directivas (frame-ancestors, object-src, base-uri, frame-src,
//   connect-src, form-action) continuam a dar defesa real.
// - 'unsafe-eval' SO em desenvolvimento (React Fast Refresh / Turbopack usam eval).
//   Em producao fica de fora.
// - Fontes Google sao self-hosted pelo next/font (servidas de 'self').
// Endurecimento futuro: migrar para CSP baseada em nonce e remover 'unsafe-inline'.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  // Embeds de YouTube (video de apresentacao na home + aulas V3).
  'frame-src https://www.youtube-nocookie.com https://www.youtube.com',
  // Avatares Google + imagens inline.
  "img-src 'self' data: https://lh3.googleusercontent.com",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com`,
  // Supabase (auth/db/storage) + telemetria Vercel.
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://va.vercel-scripts.com https://vitals.vercel-insights.com",
  "form-action 'self'",
  "manifest-src 'self'",
].join('; ');

// Headers de seguranca aplicados a todas as rotas. HSTS e tambem injectado pela
// Vercel no dominio custom; declaramo-lo aqui de forma explicita.
const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Impede o browser de adivinhar (sniff) o content-type.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Anti-clickjacking (legado; frame-ancestors da CSP e o equivalente moderno).
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
    // Limite de payload de Server Actions. A V2.5 fixava 64kb (sem uploads),
    // mas a V3 faz upload de PDFs (createLessonAction) — o schema da PR2
    // (storage.buckets.lesson-pdfs) permite até 20 MB e damos buffer para o
    // resto do FormData. Esta é a reconciliação que a nota da V2.5 antecipava.
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
