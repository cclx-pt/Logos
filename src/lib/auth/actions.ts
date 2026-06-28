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
import { getCurrentUser, getServerClient } from './index';
import { getServiceRoleClient } from './service-client';
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

// ---------------------------------------------------------------------------
// Apagar conta (RGPD art. 17 — direito ao apagamento). O utilizador apaga a
// própria conta e todos os dados associados. Sempre a sessão actual: nunca
// recebe um id de alvo do cliente (sem IDOR).
//
// Ordem obrigatória pela BD: `profiles.external_auth_id → auth.users` tem
// `ON DELETE RESTRICT` (migration 20260514002002), por isso apaga-se primeiro o
// `profiles` (que faz CASCADE para inscrições, conclusões de aula/curso,
// perguntas + mensagens de conversa, etiquetas do utilizador e logs de acesso)
// e só depois o registo de identidade em `auth.users`. As FK de auditoria
// (`created_by` / `assigned_by`, todas `ON DELETE RESTRICT`) só existem para
// admins/super_admins — para um utilizador normal a cascata é limpa.
// ---------------------------------------------------------------------------

export type DeleteAccountState = { status: 'idle' } | { status: 'error'; message: string };

const SUPPORT_EMAIL = 'logos@cclx.pt';

export async function deleteAccountAction(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  // Confirmação textual: defesa contra cliques acidentais, não é segurança.
  const confirm = formData.get('confirm');
  if (typeof confirm !== 'string' || confirm.trim().toUpperCase() !== 'APAGAR') {
    return { status: 'error', message: 'Escreve APAGAR para confirmar.' };
  }

  const profile = await getCurrentUser();
  if (!profile) {
    return { status: 'error', message: 'Sessão expirada. Inicia sessão e tenta novamente.' };
  }

  const svc = getServiceRoleClient();

  // 1. Apagar o profile (cascata para todos os dados do domínio Logos).
  const { error: profileError } = await svc.from('profiles').delete().eq('id', profile.id);
  if (profileError) {
    // Bloqueado por uma FK de auditoria (utilizador é admin com conteúdos
    // criados / etiquetas atribuídas). Eliminação manual via suporte.
    return {
      status: 'error',
      message: `Não foi possível apagar a conta automaticamente. Contacta ${SUPPORT_EMAIL} para concluir o pedido.`,
    };
  }

  // 2. Apagar a identidade em auth.users (já sem profile a referenciá-la).
  const { error: authError } = await svc.auth.admin.deleteUser(profile.externalAuthId);
  if (authError) {
    return {
      status: 'error',
      message: `A conta foi parcialmente removida. Contacta ${SUPPORT_EMAIL} para concluir.`,
    };
  }

  // 3. Limpar os cookies da sessão (a identidade já não existe).
  try {
    const supabase = await getServerClient();
    await supabase.auth.signOut();
  } catch {
    // Sessão já inválida — ignorar.
  }

  redirect('/?conta-apagada=1');
}
