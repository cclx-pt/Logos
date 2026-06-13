/**
 * Camada de identidade do Logos — V2 PR2.
 *
 * Esta é a **única** parte da aplicação que pode importar `@supabase/ssr`
 * e `@supabase/supabase-js` (regra dura em CLAUDE.md + ESLint
 * `no-restricted-imports`). O resto da app consome a API pública daqui:
 * `getCurrentUser()`, `getServerClient()`, e as Server Actions em `./actions`.
 *
 * Ver `feature-docs/auth-architecture.md` (princípios) e
 * `feature-docs/v2-auth.md` §2 (escopo desta PR).
 */

import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';

export type { SupabaseUser };

export type Role = 'user' | 'admin' | 'super_admin';

/**
 * Etiqueta PT-PT canónica para cada `Role`. Usada em `/perfil`, `/admin` e
 * `/admin/utilizadores` — manter sincronizado.
 */
export const ROLE_LABEL: Record<Role, string> = {
  user: 'Utilizador',
  admin: 'Administrador',
  super_admin: 'Super administrador',
};

export type Profile = {
  id: string;
  externalAuthId: string;
  displayName: string;
  role: Role;
  createdAt: string;
};

type ProfileRow = {
  id: string;
  external_auth_id: string;
  display_name: string;
  role: Role;
  created_at: string;
};

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltam env vars: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY são obrigatórias.',
    );
  }
  return { url, key };
}

/**
 * Devolve um cliente Supabase autenticado com a sessão actual.
 *
 * Em Server Components, escritas a cookies podem falhar (Next.js bloqueia)
 * — apanhamos silenciosamente porque o middleware (`src/middleware.ts`)
 * vai refrescar os cookies no próximo request.
 */
export async function getServerClient(): Promise<SupabaseClient> {
  const { url, key } = getEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component — middleware refrescará no próximo request.
        }
      },
    },
  });
}

/**
 * Cliente Supabase para Route Handlers (escreve cookies na `NextResponse`
 * passada). É necessário porque `cookieStore.set()` do `next/headers`
 * **não** propaga cookies para uma `NextResponse.redirect()` — só funciona
 * em Server Components / Server Actions geridos pelo framework.
 *
 * Padrão canónico Supabase Next.js: montar a `NextResponse` primeiro,
 * passar o seu objecto `cookies` ao client, e devolver essa response.
 */
export async function getRouteHandlerClient(response: NextResponse): Promise<SupabaseClient> {
  const { url, key } = getEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}

/**
 * Devolve o `Profile` da sessão activa, ou `null` se não houver sessão.
 *
 * Faz o lookup `auth.uid() → profiles.external_auth_id → profiles.id`.
 * RLS em `profiles` permite ao próprio user ler a sua row (policy
 * `profiles_select_own_or_super_admin` na migration 20260514002002).
 */
export async function getCurrentUser(): Promise<Profile | null> {
  const supabase = await getServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, external_auth_id, display_name, role, created_at')
    .eq('external_auth_id', user.id)
    .maybeSingle<ProfileRow>();

  if (error || !data) return null;

  return {
    id: data.id,
    externalAuthId: data.external_auth_id,
    displayName: data.display_name,
    role: data.role,
    createdAt: data.created_at,
  };
}

/**
 * Email da sessão activa, lido da camada de identidade (`auth.users`), ou
 * `null` se não houver sessão. Existe porque o `Profile` **não** transporta o
 * email (regra dura: email não é duplicado em tabelas Logos; vive em
 * `auth.users`). Quem precisar dele - p.ex. o Reply-To das perguntas às aulas -
 * pede-o aqui, on-demand, sem o persistir.
 */
export async function getCurrentAuthEmail(): Promise<string | null> {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
