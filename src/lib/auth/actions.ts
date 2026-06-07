'use server';

/**
 * Server Actions de identidade — V2 PR2 (multi-provider desde V3.3).
 *
 * Encapsulam o fluxo OAuth e logout. Importadas por componentes client
 * (`<form action={signInWithGoogleAction}>` / `formAction={...}`) ou server.
 *
 * Providers suportados: Google e Microsoft (Entra/Azure). Apple fica fora
 * de âmbito por agora (exige Apple Developer Program pago; reabrir quando
 * justificado). Email/password continua fora de âmbito (ver `SPEC_1.md`
 * §17/§18). Para adicionar um provider basta uma entrada em `OAuthProvider`
 * + um wrapper exportado.
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

// Providers OAuth suportados. A chave é o slug do Supabase Auth
// (Microsoft = `azure`); o label é só para mensagens de erro.
const PROVIDERS = {
  google: 'Google',
  azure: 'Microsoft',
} as const;
type OAuthProvider = keyof typeof PROVIDERS;

async function signInWithProvider(provider: OAuthProvider, formData?: FormData): Promise<void> {
  const supabase = await getServerClient();
  const origin = getOrigin(await headers());

  const next = formData ? safeNextPath(formData.get('next')) : null;
  const callback = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: callback,
      // Entra/Azure só devolve o email com o scope explícito; Google já o
      // inclui por omissão.
      ...(provider === 'azure' ? { scopes: 'email' } : {}),
    },
  });

  if (error || !data?.url) {
    throw new Error(
      `Falha a iniciar autenticação ${PROVIDERS[provider]}: ${error?.message ?? 'sem URL'}`,
    );
  }

  redirect(data.url);
}

export async function signInWithGoogleAction(formData?: FormData): Promise<void> {
  return signInWithProvider('google', formData);
}

export async function signInWithMicrosoftAction(formData?: FormData): Promise<void> {
  return signInWithProvider('azure', formData);
}

export async function signOutAction(): Promise<void> {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

// ---------------------------------------------------------------------------
// Email OTP (passwordless) — V3.3. Terceiro método de login para quem não tem
// Google nem Microsoft. Código de 6 dígitos via SMTP do Supabase (Resend).
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
