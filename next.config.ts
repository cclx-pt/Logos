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
  // Embeds de YouTube (video de apresentacao na home + aulas V3) + desafio
  // Cloudflare Turnstile (captcha do login por email OTP, corre num iframe)
  // + visualizador inline da sebenta PDF. 'self': o iframe da sebenta aponta
  // para o route handler same-origin /conteudos/.../sebenta, que faz 302 para
  // a signed URL do bucket lesson-pdfs (por isso *.supabase.co tambem e
  // preciso - a CSP valida cada salto do redirect). O wildcard *.supabase.co
  // cobre logos-dev e logos-prod sem acoplar a CSP a env vars de build.
  "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://challenges.cloudflare.com https://*.supabase.co",
  // Avatares Google + imagens inline + banners de cursos (signed URLs do
  // bucket course-banners, servidas de *.supabase.co - ver frame-src).
  "img-src 'self' data: https://lh3.googleusercontent.com https://*.supabase.co",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // va.vercel-scripts.com: telemetria Vercel. challenges.cloudflare.com: script
  // do Turnstile (api.js) carregado pelo TurnstileWidget quando ha site key.
  // www.youtube.com: script da IFrame Player API (iframe_api + www-widgetapi.js)
  // que o tutorial (/como-funciona) carrega para a pagina para controlar o
  // player (autoplay fiavel do 1.o video + loop sem corte). O <iframe> de embed
  // continua coberto por frame-src; isto e so para o *script* da API.
  // 'wasm-unsafe-eval': o ffmpeg.wasm (extraccao do audio da aula no browser,
  // area de admin) precisa de compilar o modulo WebAssembly. E o minimo - NAO
  // e o 'unsafe-eval' geral: permite compilar wasm e mais nada.
  `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ''} https://va.vercel-scripts.com https://challenges.cloudflare.com https://www.youtube.com`,
  // O @ffmpeg/ffmpeg arranca o seu worker a partir de um blob URL. Sem isto o
  // worker nunca chega a nascer e a conversao morre em silencio.
  "worker-src 'self' blob:",
  // Audio das aulas. 'self': o <audio> aponta para o route handler same-origin
  // /conteudos/.../audio, que faz 302 para a signed URL do bucket lesson-audio
  // (por isso *.supabase.co tambem e preciso - a CSP valida cada salto do
  // redirect, tal como na sebenta). blob:: pre-escuta do ficheiro convertido no
  // formulario de admin, antes de existir upload.
  // Sem esta directiva cairia em default-src 'self' e o 302 seria bloqueado.
  "media-src 'self' blob: https://*.supabase.co",
  // Supabase (auth/db/storage) + telemetria Vercel + validacao do desafio
  // Turnstile (o fetch que resolve o captcha bate aqui - sem isto o widget
  // carrega e renderiza mas nunca resolve: "nao foi possivel conectar ao site").
  "connect-src 'self' https://*.supabase.co https://*.supabase.in https://va.vercel-scripts.com https://vitals.vercel-insights.com https://challenges.cloudflare.com",
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
