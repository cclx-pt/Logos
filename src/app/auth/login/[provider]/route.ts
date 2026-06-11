/**
 * Início do fluxo OAuth — Route Handler.
 *
 * **Porquê um route handler e não uma Server Action:** o início do OAuth termina
 * num redirect para um URL *externo* (o do provider). Server Actions que fazem
 * `redirect()` externo rebentam quando invocadas pelo cliente (Next 16,
 * "Connection closed", 500) - foi o bug "This page couldn't load" do botão
 * "Entrar". Um route handler devolve um 307 HTTP real, que o browser segue sem
 * fragilidade, e os botões de login passam a ser simples `<a>`.
 *
 * `GET /auth/login/<provider>?next=<caminho-interno>`:
 *  1. valida o `provider` contra o registry e o `next` (anti open-redirect);
 *  2. `signInWithOAuth` com `redirectTo = /auth/callback` (onde a sessão nasce);
 *  3. 307 para o URL do provider, com os cookies de PKCE na resposta.
 */

import { NextResponse } from 'next/server';

import { getRouteHandlerClient } from '@/lib/auth';
import { originFromHeaders } from '@/lib/auth/origin';
import { isSignInProvider } from '@/lib/auth/providers';
import { safeNextPath } from '@/lib/auth/redirect';

type RouteContext = { params: Promise<{ provider: string }> };

export async function GET(request: Request, { params }: RouteContext): Promise<NextResponse> {
  const { provider } = await params;
  const origin = originFromHeaders(request.headers);

  if (!isSignInProvider(provider)) {
    return NextResponse.redirect(new URL('/?auth_error=unknown_provider', origin));
  }

  const requestUrl = new URL(request.url);
  const next = safeNextPath(requestUrl.searchParams.get('next'));
  const callback = next
    ? `${origin}/auth/callback?next=${encodeURIComponent(next)}`
    : `${origin}/auth/callback`;

  // O Location é um placeholder - substituído pelo URL do provider mais abaixo.
  // O importante é que `response` recolhe os cookies de PKCE (code_verifier)
  // escritos por `signInWithOAuth` via o adaptador de `getRouteHandlerClient`.
  const response = NextResponse.redirect(new URL('/', origin));
  const supabase = await getRouteHandlerClient(response);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: callback },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(new URL('/?auth_error=oauth_init', origin));
  }

  response.headers.set('location', data.url);
  return response;
}
