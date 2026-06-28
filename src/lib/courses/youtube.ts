/**
 * Extrai o ID do vídeo a partir de uma URL YouTube nos formatos aceites
 * pela Server Action de PR4b (`youtu.be/<id>` ou `youtube.com/watch?v=<id>`).
 * Devolve `null` se a URL não bater com nenhum formato — defesa em caso
 * de URL antiga/corrompida.
 *
 * O ID YouTube canónico é 11 chars de [A-Za-z0-9_-]; aceitamos esse
 * conjunto via regex para evitar interpretar caracteres especiais.
 */
const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function extractYoutubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname === 'youtu.be') {
      id = parsed.pathname.slice(1).split('/')[0] ?? null;
    } else if (parsed.hostname === 'youtube.com' || parsed.hostname === 'www.youtube.com') {
      id = parsed.searchParams.get('v');
    }
    if (id && YT_ID_RE.test(id)) return id;
    return null;
  } catch {
    return null;
  }
}
