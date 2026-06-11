/**
 * Resolução + allowlist do origin do request, para compor o `redirectTo` do
 * OAuth. Partilhado entre o route handler de login (`/auth/login/[provider]`)
 * e qualquer outro ponto que precise do origin de confiança.
 *
 * Defesa em profundidade contra host-header injection: o origin que compõe o
 * `redirectTo` tem de ser um host conhecido. O allowlist do Supabase já rejeita
 * callbacks forjados; validamos aqui também para nunca construir um `redirectTo`
 * apontado a um domínio de atacante.
 */

/** Hosts legítimos: produção, dev local e previews Vercel. */
export function isAllowedHost(host: string): boolean {
  const hostname = (host.split(':')[0] ?? '').toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'logos.cclx.pt' ||
    hostname.endsWith('.vercel.app')
  );
}

/**
 * Deriva o origin (`https://host`) a partir dos headers do request, preferindo
 * o header `origin` e caindo para `x-forwarded-proto`/`x-forwarded-host`/`host`.
 * Lança se o host estiver em falta, o URL for inválido, ou o host não estiver
 * no allowlist.
 */
export function originFromHeaders(headersList: Headers): string {
  const originHeader = headersList.get('origin');
  let candidate: string;
  if (originHeader) {
    candidate = originHeader;
  } else {
    const proto = headersList.get('x-forwarded-proto') ?? 'https';
    const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
    if (!host) {
      throw new Error('Não consigo determinar o origin do request (host header em falta).');
    }
    candidate = `${proto}://${host}`;
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('Origin do request inválido.');
  }
  if (!isAllowedHost(parsed.host)) {
    throw new Error(`Origin não permitido: ${parsed.host}`);
  }
  return parsed.origin;
}
