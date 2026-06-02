'use server';

/**
 * Server Actions de identidade — V2 PR2.
 *
 * Encapsulam o fluxo OAuth (Google) e logout. Importadas por componentes
 * client (`<form action={signInWithGoogleAction}>`) ou server.
 *
 * Email/password está fora de âmbito V1-V9 (ver `SPEC_1.md` §17/§18); a
 * única função de sign-in exportada é `signInWithGoogleAction`.
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

export async function signInWithGoogleAction(formData?: FormData): Promise<void> {
  const supabase = await getServerClient();
  const origin = getOrigin(await headers());

  const next = formData ? safeNextPath(formData.get('next')) : null;
  const callback = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callback,
    },
  });

  if (error || !data?.url) {
    throw new Error(`Falha a iniciar autenticação Google: ${error?.message ?? 'sem URL'}`);
  }

  redirect(data.url);
}

export async function signOutAction(): Promise<void> {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect('/');
}

/**
 * Apaga a conta do utilizador autenticado — RGPD art. 17 (direito ao apagamento).
 *
 * Toda a autoridade vive na função SECURITY DEFINER `delete_own_account()`
 * (migration 20260602100000): resolve o alvo por `auth.uid()`, por isso esta
 * action não passa — nem podia passar — um id, e ninguém apaga a conta de outrem.
 * Depois de apagar, a sessão fica órfã; o signOut limpa os cookies (best-effort,
 * a sessão já pode estar inválida) e redirecionamos para a home.
 */
export async function deleteAccountAction(): Promise<void> {
  const supabase = await getServerClient();

  const { error } = await supabase.rpc('delete_own_account');
  if (error) {
    throw new Error(`Falha a apagar a conta: ${error.message}`);
  }

  await supabase.auth.signOut();
  redirect('/');
}
