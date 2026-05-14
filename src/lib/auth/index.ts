/**
 * Camada de identidade do Logos — V2 PR1 (skeleton).
 *
 * Esta é a **única** parte da aplicação que pode importar `@supabase/ssr`
 * (regra dura em CLAUDE.md + ESLint `no-restricted-imports`). O resto da
 * app consome `getCurrentUser()` e `getServerClient()` daqui.
 *
 * Estado actual (V2 PR1): só **tipos + stubs**. Implementações reais entram
 * em V2 PR2 (login flow). Ver `feature-docs/v2-auth.md` §1-§2 e
 * `feature-docs/auth-architecture.md`.
 */

export type Role = 'user' | 'admin' | 'super_admin';

export type Profile = {
  id: string;
  externalAuthId: string;
  displayName: string;
  role: Role;
  createdAt: string;
};

/**
 * Devolve o `Profile` da sessão activa, ou `null` se não houver sessão.
 *
 * V2 PR1: stub que devolve sempre `null` (build-time / SSR sem sessão).
 * V2 PR2: lê cookies via `@supabase/ssr` + lookup
 * `auth.uid() → profiles.external_auth_id → profiles.id`.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  return null;
}

/**
 * Devolve um cliente Supabase autenticado (cookies da sessão actual).
 *
 * V2 PR1: stub que atira. Ninguém deve chamar isto até V2 PR2.
 * Mantemos a assinatura aqui para fixar o contrato — qualquer consumidor
 * que tente usar agora falha em tempo de execução com mensagem clara.
 */
export function getServerClient(): never {
  throw new Error('getServerClient() ainda não implementado — chega em V2 PR2 com o login flow.');
}

/**
 * Inicia o fluxo de login com Google OAuth via Supabase Auth.
 *
 * V2 PR1: stub que atira. Implementação real em V2 PR2.
 * Email/password está deliberadamente fora de âmbito V1-V9 (ver SPEC_1.md §17/§18);
 * é por isso que esta é a única função de sign-in exportada.
 */
export async function signInWithGoogle(): Promise<never> {
  throw new Error('signInWithGoogle() ainda não implementado — chega em V2 PR2.');
}

/**
 * Termina a sessão actual.
 *
 * V2 PR1: stub que atira. Implementação real em V2 PR2.
 */
export async function signOut(): Promise<never> {
  throw new Error('signOut() ainda não implementado — chega em V2 PR2.');
}
