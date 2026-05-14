/**
 * Proxy helper de identidade — V2 PR2.
 *
 * Refresca o token Supabase em cada request. Sem isto, sessões expiram
 * silenciosamente após ~1h e o user vê-se "deslogado" sem aviso.
 *
 * Importado por `src/proxy.ts` (raiz). A regra ESLint `no-restricted-imports`
 * em `eslint.config.mjs` força que `@supabase/ssr` só seja importado dentro
 * de `src/lib/auth/**` — daí este helper viver aqui e o `proxy.ts` raiz ser
 * apenas um shim que chama esta função.
 *
 * Next.js 16 renomeou a convenção `middleware` → `proxy`. Função e ficheiro
 * acompanham.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    // Em build sem env (ex.: alguns testes), passamos sem refrescar.
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // IMPORTANTE: nada entre createServerClient e getUser() — o cliente refresca
  // o token aqui se estiver perto de expirar, e os cookies novos vão na resposta.
  await supabase.auth.getUser();

  return response;
}
