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

function getOrigin(headersList: Headers): string {
  const origin = headersList.get('origin');
  if (origin) return origin;
  const proto = headersList.get('x-forwarded-proto') ?? 'https';
  const host = headersList.get('x-forwarded-host') ?? headersList.get('host');
  if (!host) {
    throw new Error('Não consigo determinar o origin do request (host header em falta).');
  }
  return `${proto}://${host}`;
}

function safeNext(next: FormDataEntryValue | null): string | null {
  if (typeof next !== 'string' || !next) return null;
  if (!next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

export async function signInWithGoogleAction(formData?: FormData): Promise<void> {
  const supabase = await getServerClient();
  const origin = getOrigin(await headers());

  const next = formData ? safeNext(formData.get('next')) : null;
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
