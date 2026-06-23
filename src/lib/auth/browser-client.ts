/**
 * Cliente Supabase para o BROWSER - V3.6.
 *
 * Usado para Supabase Realtime no cliente (ex.: estado da transmissão em
 * direto, que muda quando o admin liga/desliga o interruptor). Vive em
 * `src/lib/auth/` porque é a única camada autorizada a importar `@supabase/ssr`
 * (regra dura em CLAUDE.md + ESLint `no-restricted-imports`). O resto da app
 * consome `subscribeToTable()` sem nunca tocar em tipos do Supabase.
 *
 * Singleton: o `createBrowserClient` é instanciado uma vez por documento, para
 * evitar múltiplos clientes Realtime/GoTrue.
 */
import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

let cached: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltam env vars: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY são obrigatórias.',
    );
  }

  cached = createBrowserClient(url, key);
  return cached;
}

/**
 * Subscreve mudanças (INSERT/UPDATE/DELETE) de uma tabela via Supabase Realtime
 * e chama `onChange` a cada evento. Devolve uma função para cancelar a
 * subscrição.
 *
 * Mantém os tipos do Supabase encapsulados nesta camada: quem chama (ex.: o
 * hook de estado live) não importa `@supabase/*`. Requer que a tabela esteja na
 * publicação `supabase_realtime` e com policy de SELECT que deixe o cliente ler.
 */
/**
 * Faz upload de um ficheiro DIRECTAMENTE do browser para o Supabase Storage,
 * usando uma signed upload URL (path + token) gerada no servidor por uma Server
 * Action admin-only. Contorna o limite de ~4.5 MB do corpo de Server Actions na
 * Vercel (o `bodySizeLimit` do Next não o sobrepõe): o ficheiro nunca passa pela
 * Function - vai directo browser -> Storage. O tamanho (<=20 MB) e o MIME são
 * impostos pelo próprio bucket.
 *
 * Vive aqui porque é a única camada autorizada a importar `@supabase/*` (regra
 * dura em CLAUDE.md). Genérica no bucket para não acoplar a identidade a
 * conceitos de domínio.
 */
export async function uploadToSignedUrl(
  bucket: string,
  path: string,
  token: string,
  file: File,
  contentType?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = getBrowserClient();
  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, token, file, contentType ? { contentType } : undefined);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function subscribeToTable(table: string, onChange: () => void): () => void {
  const supabase = getBrowserClient();
  const channel = supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange())
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
