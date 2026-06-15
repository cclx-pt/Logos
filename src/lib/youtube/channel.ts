/** Identidade pública do canal LOGOS no YouTube. Sem segredos: o channel ID é público. */
export const YOUTUBE_CHANNEL_ID = 'UCcSXFqxY-XEjMMLLW2TXmtg';
export const YOUTUBE_CHANNEL_URL = `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`;
/** Link que abre o YouTube já na caixa de confirmação de subscrição (spec §6.4). */
export const YOUTUBE_SUBSCRIBE_URL = `${YOUTUBE_CHANNEL_URL}?sub_confirmation=1`;

/**
 * Embed da transmissão em direto do CANAL (não de um vídeo específico). A
 * YouTube resolve sempre para a emissão em curso e, quando ela termina, mostra
 * um ecrã offline - NUNCA a gravação (VOD). É o que impede uma live já terminada
 * de aparecer no leitor como se ainda estivesse a decorrer (ao contrário de
 * embeber `/embed/<videoId>`, que vira gravação no fim).
 */
export const YOUTUBE_LIVE_EMBED_URL = `https://www.youtube-nocookie.com/embed/live_stream?channel=${YOUTUBE_CHANNEL_ID}&autoplay=1&rel=0`;
