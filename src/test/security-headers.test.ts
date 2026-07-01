/**
 * Regressão dos headers de segurança (next.config.ts).
 *
 * Razão de existir: o port do hardening V2.5 (#47) trouxe uma CSP verificada
 * por paridade contra `main` - mas `main` não tem banners de cursos nem
 * visualizador inline de sebentas, e a CSP bloqueou silenciosamente o
 * Supabase Storage em `img-src`/`frame-src` (banners e PDFs desapareceram
 * no preview). Estes testes pinam as origens externas reais de que cada
 * directiva depende, para a próxima revisão de CSP não repetir o erro.
 */
import { describe, expect, it } from 'vitest';

import nextConfig from '../../next.config';

async function getSecurityHeaders(): Promise<{ key: string; value: string }[]> {
  if (!nextConfig.headers) throw new Error('next.config.ts sem headers()');
  const rules = await nextConfig.headers();
  const rule = rules.find((r) => r.source === '/:path*');
  if (!rule) throw new Error('regra de headers para /:path* não encontrada');
  return rule.headers;
}

async function getCspDirectives(): Promise<Map<string, string>> {
  const headers = await getSecurityHeaders();
  const csp = headers.find((h) => h.key === 'Content-Security-Policy');
  if (!csp) throw new Error('Content-Security-Policy não encontrada');
  const directives = new Map<string, string>();
  for (const part of csp.value.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    directives.set(name, sources.join(' '));
  }
  return directives;
}

describe('CSP (next.config.ts)', () => {
  it('img-src permite avatares Google e banners do Supabase Storage', async () => {
    const csp = await getCspDirectives();
    const imgSrc = csp.get('img-src') ?? '';
    expect(imgSrc).toContain("'self'");
    expect(imgSrc).toContain('https://lh3.googleusercontent.com');
    // Banners de cursos: signed URLs do bucket course-banners (CourseImage
    // com `unoptimized` renderiza <img> com o URL do Storage directo).
    expect(imgSrc).toContain('https://*.supabase.co');
  });

  it('script-src permite a IFrame Player API do YouTube (tutorial)', async () => {
    const csp = await getCspDirectives();
    const scriptSrc = csp.get('script-src') ?? '';
    expect(scriptSrc).toContain("'self'");
    // O player do tutorial (/como-funciona) carrega iframe_api + www-widgetapi.js
    // de www.youtube.com para a página; sem isto o player nunca arranca.
    expect(scriptSrc).toContain('https://www.youtube.com');
  });

  it('frame-src permite same-origin, YouTube, Turnstile e sebentas PDF do Supabase Storage', async () => {
    const csp = await getCspDirectives();
    const frameSrc = csp.get('frame-src') ?? '';
    // 'self': o iframe da sebenta aponta para o route handler same-origin
    // /conteudos/.../sebenta, que faz 302 para a signed URL do bucket.
    expect(frameSrc).toContain("'self'");
    expect(frameSrc).toContain('https://www.youtube-nocookie.com');
    expect(frameSrc).toContain('https://challenges.cloudflare.com');
    // Sebentas: o alvo do redirect é uma signed URL do bucket lesson-pdfs.
    expect(frameSrc).toContain('https://*.supabase.co');
  });

  it('connect-src permite Supabase, telemetria Vercel e validação do Turnstile', async () => {
    const csp = await getCspDirectives();
    const connectSrc = csp.get('connect-src') ?? '';
    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('https://*.supabase.co');
    expect(connectSrc).toContain('https://va.vercel-scripts.com');
    // O fetch que resolve o desafio Turnstile bate aqui - sem isto o captcha
    // carrega mas nunca resolve ("não foi possível conectar ao site").
    expect(connectSrc).toContain('https://challenges.cloudflare.com');
  });

  it('mantém as directivas restritivas de base', async () => {
    const csp = await getCspDirectives();
    expect(csp.get('object-src')).toBe("'none'");
    expect(csp.get('base-uri')).toBe("'self'");
    expect(csp.get('frame-ancestors')).toBe("'self'");
    expect(csp.get('form-action')).toBe("'self'");
  });
});

describe('headers de segurança (next.config.ts)', () => {
  it('aplica o conjunto completo a todas as rotas', async () => {
    const keys = (await getSecurityHeaders()).map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
        'Strict-Transport-Security',
      ]),
    );
  });
});
