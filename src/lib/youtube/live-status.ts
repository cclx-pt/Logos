/**
 * Estado da transmissão em direto do canal LOGOS (YouTube).
 *
 * Fronteira de quota (CRÍTICO):
 *  - `search.list` custa 100 unidades; a quota diária é de 10.000. Polling
 *    contínuo esgotaria-a em minutos.
 *  - Proteção em duas camadas: (1) só chamamos a API dentro das janelas
 *    configuradas (`isWithinLiveWindow`); (2) a resposta é cachada pelo Next.js
 *    Data Cache (`fetch` com `next.revalidate`), partilhado entre invocações em
 *    Vercel - ao contrário de uma cache em memória, que seria por-instância e
 *    efémera no serverless.
 *
 * Fail-safe: qualquer incerteza (sem janela, sem chave, erro/quota, resposta
 * malformada) resolve para `live: false`. Erros transitórios marcam `stale: true`
 * para monitorização, sem partir a página.
 *
 * A `YOUTUBE_API_KEY` vive só no servidor; este módulo nunca corre no cliente.
 */
import { isWithinLiveWindow } from './live-windows';

const DEFAULT_CHANNEL_ID = 'UCcSXFqxY-XEjMMLLW2TXmtg';
const DEFAULT_TTL_SECONDS = 180;
const SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search';
const VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos';
// videos.list custa 1 unidade (vs 100 do search.list): dá para confirmar o fim
// da emissão com muito mais frequência sem pressão de quota.
const VERIFY_TTL_SECONDS = 60;

export type LiveStatus = {
  live: boolean;
  videoId: string | null;
  title: string | null;
  /** ISO-8601 do momento em que o estado foi determinado. */
  checkedAt: string;
  /** Presente e `true` quando o estado não pôde ser confirmado (erro/quota). */
  stale?: boolean;
};

function offline(stale = false): LiveStatus {
  const status: LiveStatus = {
    live: false,
    videoId: null,
    title: null,
    checkedAt: new Date().toISOString(),
  };
  if (stale) status.stale = true;
  return status;
}

/**
 * Interpreta a resposta de `search.list`. `items[0]` (o mais recente) define o
 * estado. Sem itens ou com forma inesperada => offline (canal parado é o caso
 * normal, não um erro).
 */
export function parseSearchResponse(data: unknown): LiveStatus {
  if (typeof data !== 'object' || data === null) return offline();
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length === 0) return offline();

  const first = items[0] as {
    id?: { videoId?: unknown };
    snippet?: { title?: unknown };
  };
  const videoId = first.id?.videoId;
  if (typeof videoId !== 'string' || videoId.length === 0) return offline();

  const title = typeof first.snippet?.title === 'string' ? first.snippet.title : null;
  return { live: true, videoId, title, checkedAt: new Date().toISOString() };
}

/**
 * Interpreta `videos.list` (part `snippet,liveStreamingDetails`) para decidir
 * se um vídeo continua GENUINAMENTE em direto.
 *
 * Necessário porque `search.list?eventType=live` tem atraso de propagação e
 * continua a listar uma emissão durante minutos depois de ela terminar - sem
 * esta verificação, o leitor passava a reproduzir a gravação (VOD) como se
 * ainda fosse uma transmissão em direto.
 *
 *  - `true`  → confirmado em direto (`liveBroadcastContent === 'live'`, sem `actualEndTime`);
 *  - `false` → terminou, já não está live, ou o vídeo foi removido;
 *  - `null`  → resposta indeterminada (o chamador decide).
 */
export function parseVideoLiveState(data: unknown): boolean | null {
  if (typeof data !== 'object' || data === null) return null;
  const items = (data as { items?: unknown }).items;
  if (!Array.isArray(items)) return null;
  if (items.length === 0) return false; // vídeo inexistente/removido => offline

  const first = items[0] as {
    snippet?: { liveBroadcastContent?: unknown };
    liveStreamingDetails?: { actualEndTime?: unknown };
  };

  // `actualEndTime` é preenchido no instante em que a emissão termina.
  if (typeof first.liveStreamingDetails?.actualEndTime === 'string') return false;

  return first.snippet?.liveBroadcastContent === 'live';
}

/**
 * Confirma via `videos.list` se o `videoId` candidato está mesmo em direto.
 * Devolve `null` em erro/dúvida (o chamador mantém o resultado do search).
 */
async function verifyStillLive(videoId: string, apiKey: string): Promise<boolean | null> {
  const url = new URL(VIDEOS_ENDPOINT);
  url.searchParams.set('part', 'snippet,liveStreamingDetails');
  url.searchParams.set('id', videoId);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url, { next: { revalidate: VERIFY_TTL_SECONDS } });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    return parseVideoLiveState(data);
  } catch {
    return null;
  }
}

function getTtlSeconds(): number {
  const raw = Number(process.env.YOUTUBE_CACHE_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_SECONDS;
}

/**
 * Determina o estado live do canal. Lê a configuração de ambiente em cada
 * chamada (sem estado de módulo); a única cache é a do `fetch` (Data Cache).
 */
export async function getLiveStatus(now: Date = new Date()): Promise<LiveStatus> {
  if (!isWithinLiveWindow(now, process.env.YOUTUBE_LIVE_WINDOWS)) {
    return offline();
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return offline(true);

  const channelId = process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID;
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('eventType', 'live');
  url.searchParams.set('type', 'video');
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url, { next: { revalidate: getTtlSeconds() } });
    if (!res.ok) return offline(true);
    const data: unknown = await res.json();
    const candidate = parseSearchResponse(data);

    // `search.list?eventType=live` continua a listar uma emissão já terminada
    // (atraso de propagação). Confirmar com `videos.list` antes de declarar live.
    if (!candidate.live || !candidate.videoId) return candidate;

    const stillLive = await verifyStillLive(candidate.videoId, apiKey);
    if (stillLive === false) return offline(); // terminou: offline confirmado
    if (stillLive === null) return { ...candidate, stale: true }; // verificação falhou
    return candidate;
  } catch {
    return offline(true);
  }
}
