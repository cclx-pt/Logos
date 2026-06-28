/**
 * Cliente Supabase com a **service role** - bypassa RLS.
 *
 * Vive em `src/lib/auth/` (fronteira de identidade) porque é o único sítio
 * autorizado a importar `@supabase/supabase-js`. **Só servidor:** a chave
 * `SUPABASE_SERVICE_ROLE_KEY` não tem prefixo `NEXT_PUBLIC_`, por isso é
 * `undefined` no cliente; e este módulo só é importado por Server Actions
 * ('use server'), nunca por componentes de cliente.
 *
 * Uso actual: chamar `check_rate_limit()` (RPC concedido apenas a
 * service_role) a partir das Server Actions. Não usar para queries de dados
 * normais - essas correm com a sessão do utilizador via `getServerClient()`,
 * para o RLS continuar a proteger.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getServiceRoleClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltam env vars: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórias para o cliente service-role.',
    );
  }
  if (!cached) {
    cached = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
