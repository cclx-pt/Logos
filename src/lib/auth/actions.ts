'use server';

/**
 * Server Actions de identidade — V2 PR2.
 *
 * Encapsulam o fluxo OAuth e logout. Importadas por componentes client.
 *
 * `signInWithGoogleAction` **devolve o URL** do OAuth (não faz `redirect()`):
 * o cliente navega com `window.location`. Server Actions hidratadas que fazem
 * `redirect()` para um URL *externo* rebentam no Next 16 com "Connection closed"
 * (500) - o caminho no-JS funcionava (303), o hidratado não. Devolver o URL e
 * navegar no cliente é o padrão da Supabase para client components e evita a
 * fragilidade. (Os `redirect()` *internos* das outras actions são seguros.)
 *
 * Métodos de login suportados: Google (OAuth) e email + código OTP
 * (passwordless, ver mais abaixo). Microsoft/Entra foi removido (decisão do
 * líder, 10-06-2026: ficar só com Google + email). Apple e login com
 * palavra-passe continuam fora de âmbito (ver `SPEC_1.md` §17/§18).
 */

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerClient } from './index';
import { safeNextPath } from './redirect';

// Hosts legítimos para o callback OAuth: produção, dev local e previews Vercel.
function isAllowedHost(host: string): boolean {
  const hostname = (host.split(':')[0] ?? '').toLowerCase();
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === 'logos.cclx.pt' ||
    hostname.endsWith('.vercel.app')
  );
}

function getOrigin(headersList: Headers): string {
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

  // Defesa em profundidade contra host-header injection: o origin que compõe o
  // redirectTo do OAuth tem de ser um host conhecido. O allowlist do Supabase já
  // rejeita callbacks forjados; validamos aqui também para nunca construir um
  // redirectTo apontado a um domínio de atacante.
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

export async function signInWithGoogleAction(next?: string): Promise<string> {
  // Independentes — em paralelo para não somar latências no caminho de login.
  const [supabase, headersList] = await Promise.all([getServerClient(), headers()]);
  const origin = getOrigin(headersList);

  const safeNext = safeNextPath(next);
  const callback = safeNext
    ? `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`
    : `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callback },
  });

  if (error || !data?.url) {
    throw new Error(`Falha a iniciar autenticação Google: ${error?.message ?? 'sem URL'}`);
  }

  // Devolve o URL para o cliente navegar (window.location). Ver nota no topo.
  // Os cookies de PKCE (code_verifier) escritos por signInWithOAuth viajam na
  // resposta da Server Action e são aplicados antes da navegação do cliente.
  return data.url;
}

export async function signOutAction(): Promise<void> {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

// ---------------------------------------------------------------------------
// Email OTP (passwordless) — V3.3. Segundo método de login para quem não tem
// (ou não quer usar) Google. Código de 6 dígitos via SMTP do Supabase (Resend).
// Plano: feature-docs/email-otp-login.md. Fluxo de 2 passos (enviar → verificar),
// por isso usa `useActionState` em vez do `signInWithProvider` (que faz redirect
// imediato). Sem mudanças de DB: o trigger `on_auth_user_created` cria o profile.
// ---------------------------------------------------------------------------

// Validação de email pragmática (não RFC-completa): um `@`, algo antes, um ponto
// no domínio. O Supabase faz a validação autoritativa; isto é só UX/anti-lixo.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_MAX = 254;
const OTP_RE = /^\d{6}$/;

export type SendEmailOtpState =
  | { status: 'idle' }
  | { status: 'sent'; email: string }
  | { status: 'error'; message: string };

export type VerifyEmailOtpState = { status: 'idle' } | { status: 'error'; message: string };

/**
 * Passo 1 — envia o código para o email. Não faz redirect (fluxo de 2 passos):
 * devolve `{ status: 'sent', email }` para o componente avançar para o passo do
 * código. `shouldCreateUser: true` ⇒ resposta igual para email novo/existente
 * (anti-enumeration). O `captchaToken` (Turnstile) só vai se estiver presente —
 * fica inerte até o captcha ser configurado no Supabase.
 */
export async function sendEmailOtpAction(
  _prev: SendEmailOtpState,
  formData: FormData,
): Promise<SendEmailOtpState> {
  const raw = formData.get('email');
  const email = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!email || email.length > EMAIL_MAX || !EMAIL_RE.test(email)) {
    return { status: 'error', message: 'Escreve um email válido.' };
  }

  const captchaRaw = formData.get('captchaToken');
  const captchaToken = typeof captchaRaw === 'string' && captchaRaw ? captchaRaw : undefined;

  const supabase = await getServerClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      ...(captchaToken ? { captchaToken } : {}),
    },
  });

  if (error) {
    // Mensagem genérica: não revelar se a conta existe nem detalhes do provider.
    return {
      status: 'error',
      message: 'Não foi possível enviar o código. Confirma o email e tenta novamente.',
    };
  }

  return { status: 'sent', email };
}

/**
 * Passo 2 — verifica o código e cria a sessão. Em sucesso faz `redirect` para o
 * `next` validado (a sessão persiste via cookies escritos pelo Server Action).
 * Em erro devolve estado para o componente mostrar a mensagem sem perder o email.
 */
export async function verifyEmailOtpAction(
  _prev: VerifyEmailOtpState,
  formData: FormData,
): Promise<VerifyEmailOtpState> {
  const emailRaw = formData.get('email');
  const tokenRaw = formData.get('token');
  const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
  const token = typeof tokenRaw === 'string' ? tokenRaw.trim() : '';

  if (!EMAIL_RE.test(email)) {
    return { status: 'error', message: 'Sessão inválida. Recomeça o início de sessão.' };
  }
  if (!OTP_RE.test(token)) {
    return { status: 'error', message: 'O código tem de ter 6 dígitos.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) {
    return { status: 'error', message: 'Código inválido ou expirado. Pede um novo.' };
  }

  const next = safeNextPath(formData.get('next'));
  redirect(next ?? '/');
}
