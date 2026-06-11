'use server';

/**
 * Server Actions de identidade — V2 PR2.
 *
 * Encapsulam logout e o login por email OTP. Importadas por componentes client.
 *
 * **O início do OAuth (Google) não vive aqui** - é o route handler
 * `src/app/auth/login/[provider]/route.ts`, que devolve um 307 HTTP real para
 * o provider. Server Actions que fazem `redirect()` para um URL *externo*
 * rebentam quando invocadas pelo cliente (Next 16, "Connection closed", 500 -
 * foi o bug do botão "Entrar"). Os `redirect()` *internos* abaixo são seguros.
 *
 * Métodos de login suportados: Google (OAuth, via route handler) e email +
 * código OTP (passwordless, ver mais abaixo). Microsoft/Entra foi removido
 * (decisão do líder, 10-06-2026: ficar só com Google + email). Apple e login
 * com palavra-passe continuam fora de âmbito (ver `SPEC_1.md` §17/§18).
 */

import { redirect } from 'next/navigation';
import { getServerClient } from './index';
import { safeNextPath } from './redirect';

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
