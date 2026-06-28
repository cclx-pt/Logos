/**
 * Helpers de signed URLs para o bucket `course-banners` (V3.2 PR1).
 *
 * Banners são privados: o bucket tem RLS por path (`course_banners_select_visible`
 * — migration 20260527000000) que valida visibilidade via `course_is_visible`.
 * A UI nunca expõe paths directos — só URLs assinadas de curta duração
 * geradas server-side, batched para listagens.
 *
 * **Porquê 30 min de TTL** (vs 5 min do PDF):
 *   Banners aparecem em listagens (catálogo, /meus-cursos, landing pages).
 *   TTL curto forçaria signing a cada render. 30 min é compromisso entre
 *   cache eficiente e janela razoável de revogação se um curso for
 *   despublicado. A RLS por path já filtra acessos não autorizados na
 *   próxima rotação de URL.
 *
 * **Falha graciosa**: se o signing falhar (rate limit, etc.), devolvemos
 *   Map vazio em vez de propagar erro. A UI cai no fallback de icon e o
 *   utilizador não vê página partida.
 */

import { getServerClient } from '@/lib/auth';

const BANNER_SIGN_TTL_SECONDS = 60 * 30;

/**
 * Assina um lote de paths de uma vez (mais eficiente que N chamadas).
 * Devolve Map<path, signedUrl>. Paths inválidos ou que falhem são omitidos.
 */
export async function getBannerUrlsByPath(paths: string[]): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const supabase = await getServerClient();
  const { data, error } = await supabase.storage
    .from('course-banners')
    .createSignedUrls(paths, BANNER_SIGN_TTL_SECONDS);
  if (error || !data) return new Map();
  const out = new Map<string, string>();
  for (const item of data) {
    if (item.path && item.signedUrl) out.set(item.path, item.signedUrl);
  }
  return out;
}

/** Assina um único path. Atalho para callers single-course (page de curso). */
export async function getBannerUrlForPath(path: string | null): Promise<string | null> {
  if (!path) return null;
  const urls = await getBannerUrlsByPath([path]);
  return urls.get(path) ?? null;
}
