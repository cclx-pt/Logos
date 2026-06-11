/**
 * OAuth callback do Google (via Supabase Auth) — V2 PR2.
 *
 * Fluxo:
 *  1. User clica "Continuar com Google" → o route handler `/auth/login/google`
 *     redirecciona para Google.
 *  2. Google redirecciona de volta para `${origin}/auth/callback?code=...`.
 *  3. Aqui trocamos `code` por sessão (cookies de auth) via
 *     `exchangeCodeForSession`. O profile correspondente em `profiles` é
 *     criado automaticamente pelo trigger DB `on_auth_user_created`
 *     (migration V2 PR2). Não tocamos em `profiles` daqui — sem service role.
 *  4. Redirecciona para `?next=` (se válido) ou para `/`.
 *
 * Padrão de cookies: usamos `getRouteHandlerClient(response)` que escreve
 * cookies directamente na `NextResponse` que vamos devolver. `cookieStore.set()`
 * do `next/headers` **não** propaga para `NextResponse.redirect()` — sem este
 * padrão, a sessão não persiste após o redirect.
 *
 * Erros são reportados via querystring `?auth_error=` para a Home tratar
 * (nesta PR não há UI específica de erro; fica para futuro).
 */

import { NextResponse } from 'next/server';
import { getRouteHandlerClient } from '@/lib/auth';
import { safeNextPath } from '@/lib/auth/redirect';

export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = safeNextPath(url.searchParams.get('next')) ?? '/';

  if (!code) {
    return NextResponse.redirect(new URL('/?auth_error=missing_code', url.origin));
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  const supabase = await getRouteHandlerClient(response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL('/?auth_error=exchange_failed', url.origin));
  }

  return response;
}
