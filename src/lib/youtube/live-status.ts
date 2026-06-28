/**
 * Estado da transmissão em direto do canal LOGOS (YouTube).
 *
 * Mecanismo primário (V3.6): o interruptor admin `live_override`. A equipa
 * carrega em "Estamos no ar" e a emissão aparece a toda a gente em <1s (via
 * Realtime), sem editar env vars nem esperar por janelas. `getLiveStatus` lê
 * essa linha primeiro; só na sua ausência recorre ao mecanismo secundário das
 * janelas (`YOUTUBE_LIVE_WINDOWS`), mantido para retrocompatibilidade.
 *
 * Fronteira de quota (CRÍTICO):
 *  - `search.list` custa 100 unidades; a quota diária é de 10.000. Polling
 *    contínuo esgotaria-a em minutos. Com o interruptor admin, o `search.list`
 *    corre essencialmente uma vez por emissão (ao ligar), não em ciclo.
 *  - O fim da emissão e a verificação contínua usam `videos.list` (1 unidade),
 *    cachado pelo Next.js Data Cache (`fetch` com `next.revalidate`),
 *    partilhado entre invocações em Vercel - ao contrário de uma cache em
 *    memória, que seria por-instância e efémera no serverless.
 *
 * Pureza de leitura: `getLiveStatus` NUNCA escreve (o visitante pode ser
 * anónimo). O fim da emissão é detetado por `videos.list`; a propagação
 * instantânea do offline vem do clique admin "Terminámos" + Realtime.
 *
 * Fail-safe: qualquer incerteza (sem override, sem janela, sem chave,
 * erro/quota, resposta malformada) resolve para `live: false`. Erros
 * transitórios marcam `stale: true` para monitorização, sem partir a página.
 *
 * A `YOUTUBE_API_KEY` vive só no servidor; este módulo nunca corre no cliente.
 */
import { isWithinLiveWindow } from './live-windows';
import { readLiveOverride, type LiveOverride } from './live-override';

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
 * `search.list?eventType=live` no canal. Devolve o candidato parseado
 * (`offline(true)` em erro HTTP). `fresh: true` ignora o Data Cache - usado
 * pela área admin ao ligar, para não apanhar um "offline" cachado de antes do
 * stream começar.
 */
async function searchChannelLive(apiKey: string, fresh = false): Promise<LiveStatus> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID || DEFAULT_CHANNEL_ID;
  const url = new URL(SEARCH_ENDPOINT);
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('channelId', channelId);
  url.searchParams.set('eventType', 'live');
  url.searchParams.set('type', 'video');
  url.searchParams.set('key', apiKey);

  try {
    const res = fresh
      ? await fetch(url, { cache: 'no-store' })
      : await fetch(url, { next: { revalidate: getTtlSeconds() } });
    if (!res.ok) return offline(true);
    const data: unknown = await res.json();
    return parseSearchResponse(data);
  } catch {
    return offline(true);
  }
}

/**
 * Caminho do interruptor admin (`live_override.is_live = true`).
 *
 *  - Com `videoId` já resolvido: confirma via `videos.list` para detetar o fim
 *    automaticamente (offline quando termina; mantém-se live para além de
 *    `armedUntil` enquanto o stream estiver mesmo no ar).
 *  - Sem `videoId` (ligaram antes de iniciar o stream): enquanto "armado",
 *    procura o videoId; passada a validade `armedUntil`, desiste (offline). O
 *    estado intermédio é `live: true, videoId: null` (o leitor mostra "a ligar").
 */
async function liveFromOverride(
  override: LiveOverride,
  apiKey: string | undefined,
  now: Date,
): Promise<LiveStatus> {
  const checkedAt = now.toISOString();

  if (override.videoId) {
    if (!apiKey) {
      // Sem chave não dá para verificar; confia-se no que o admin declarou.
      return { live: true, videoId: override.videoId, title: null, checkedAt };
    }
    const stillLive = await verifyStillLive(override.videoId, apiKey);
    if (stillLive === false) return offline(); // emissão terminou
    if (stillLive === null) {
      return { live: true, videoId: override.videoId, title: null, checkedAt, stale: true };
    }
    return { live: true, videoId: override.videoId, title: null, checkedAt };
  }

  // Ligado mas ainda sem videoId. Passada a validade, desiste-se.
  const expired =
    override.armedUntil !== null && new Date(override.armedUntil).getTime() <= now.getTime();
  if (expired) return offline();

  if (apiKey) {
    const found = await searchChannelLive(apiKey);
    if (found.live && found.videoId) {
      const verified = await verifyStillLive(found.videoId, apiKey);
      // Recém-encontrado: só uma confirmação NEGATIVA o suprime; uma falha
      // transitória (null) não impede a emissão de aparecer.
      if (verified !== false) {
        return { live: true, videoId: found.videoId, title: found.title, checkedAt };
      }
    }
  }

  // Armado, sem stream ainda: estado "a ligar" (o leitor mostra um spinner).
  return { live: true, videoId: null, title: null, checkedAt };
}

/** Caminho secundário: janelas + `search.list` + verificação (comportamento legado). */
async function liveFromWindows(apiKey: string): Promise<LiveStatus> {
  const candidate = await searchChannelLive(apiKey);

  // `search.list?eventType=live` continua a listar uma emissão já terminada
  // (atraso de propagação). Confirmar com `videos.list` antes de declarar live.
  if (!candidate.live || !candidate.videoId) return candidate;

  const stillLive = await verifyStillLive(candidate.videoId, apiKey);
  if (stillLive === false) return offline(); // terminou: offline confirmado
  if (stillLive === null) return { ...candidate, stale: true }; // verificação falhou
  return candidate;
}

/**
 * Descobre o `videoId` da emissão em direto em curso no canal (`search.list`,
 * 100 unidades, sem cache). Usado pela área admin ao ligar o interruptor.
 * `null` se nada estiver em direto ou sem chave configurada.
 */
export async function findCurrentLiveVideoId(): Promise<string | null> {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) return null;
  const candidate = await searchChannelLive(apiKey, true);
  return candidate.live ? candidate.videoId : null;
}

/**
 * Determina o estado live do canal. Lê a configuração e o interruptor em cada
 * chamada (sem estado de módulo); a única cache é a do `fetch` (Data Cache).
 *
 * Prioridade: interruptor admin > janelas. Leitura pura (nunca escreve).
 */
export async function getLiveStatus(now: Date = new Date()): Promise<LiveStatus> {
  const apiKey = process.env.YOUTUBE_API_KEY;

  // 1. Interruptor admin ("Estamos no ar"): prioritário, permite começar a
  //    qualquer hora sem editar env vars.
  const override = await readLiveOverride();
  if (override?.isLive) {
    return liveFromOverride(override, apiKey, now);
  }

  // 2. Fallback: janelas + search.list. Sem janela activa, offline sem tocar na API.
  if (!isWithinLiveWindow(now, process.env.YOUTUBE_LIVE_WINDOWS)) return offline();
  if (!apiKey) return offline(true);
  return liveFromWindows(apiKey);
}
