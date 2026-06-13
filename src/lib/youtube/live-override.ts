/**
 * Leitura do interruptor de transmissão (`live_override`) - V3.6.
 *
 * O estado "estamos no ar" é uma linha única em Postgres (migration
 * `20260613120000_live_override`). A área admin escreve-a; aqui só LEMOS, com a
 * sessão do utilizador (a policy de SELECT é pública, por isso funciona mesmo
 * para visitantes anónimos). Qualquer falha resolve para `null` (fail-safe:
 * cai-se no mecanismo secundário de janelas em `getLiveStatus`).
 *
 * Server-only: usa `getServerClient()` (cookies/`next/headers`). Nunca importar
 * a partir de um componente de cliente - o `LiveStatus` é que é o tipo
 * partilhado.
 */
import { getServerClient } from '@/lib/auth';

export type LiveOverride = {
  isLive: boolean;
  videoId: string | null;
  /** ISO-8601; validade do override enquanto não há stream verificado. */
  armedUntil: string | null;
};

type LiveOverrideRow = {
  is_live: boolean;
  video_id: string | null;
  armed_until: string | null;
};

export async function readLiveOverride(): Promise<LiveOverride | null> {
  try {
    const supabase = await getServerClient();
    const { data, error } = await supabase
      .from('live_override')
      .select('is_live, video_id, armed_until')
      .eq('id', 1)
      .maybeSingle<LiveOverrideRow>();

    if (error || !data) return null;

    return {
      isLive: data.is_live,
      videoId: data.video_id,
      armedUntil: data.armed_until,
    };
  } catch {
    // Sem contexto de pedido, sem env, ou erro de rede: cai no fallback.
    return null;
  }
}
