'use server';

/**
 * Server Actions do interruptor de transmissão em direto - V3.6.
 *
 * "Estamos no ar" / "Terminámos": ligam e desligam a `live_override` (linha
 * única). Lidas por `getLiveStatus`, propagadas a todos os visitantes por
 * Supabase Realtime (botão "Live" fica verde em <1s, sem refresh).
 *
 * Defesa em profundidade:
 *   1. Estas actions recusam se o caller não for admin nem super_admin.
 *   2. RLS `live_override_update_admin` garante que o UPDATE por outro role
 *      nunca toca a linha.
 *   3. Column-scoping (`grant update (is_live, video_id, armed_until)`) impede
 *      tocar noutras colunas (`updated_at` é do trigger).
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { findCurrentLiveVideoId } from '@/lib/youtube/live-status';

export type LiveSwitchResult = { ok: true } | { ok: false; error: string };

// Validade do "armado" quando se liga antes de o stream existir. Passado este
// tempo sem stream detetado, `getLiveStatus` resolve para offline (proteção
// contra esquecimento). Um stream verificado em direto sobrevive para além disto.
const ARM_MINUTES = 45;

const NOT_ADMIN: LiveSwitchResult = {
  ok: false,
  error: 'Apenas admin ou super_admin pode controlar a transmissão.',
};

export async function goLiveAction(): Promise<LiveSwitchResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) return NOT_ADMIN;

  // Resolve o videoId da emissão em curso (search.list, sem cache). Pode ser
  // null se o admin ligar antes de iniciar o stream no YouTube: nesse caso fica
  // "armado" e o videoId é descoberto na primeira leitura que o encontre.
  const videoId = await findCurrentLiveVideoId();
  const armedUntil = new Date(Date.now() + ARM_MINUTES * 60_000).toISOString();

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('live_override')
    .update({ is_live: true, video_id: videoId, armed_until: armedUntil })
    .eq('id', 1);

  if (error) return { ok: false, error: `Falha a ligar a transmissão: ${error.message}` };

  revalidatePath('/admin/live');
  revalidatePath('/live');
  return { ok: true };
}

export async function endLiveAction(): Promise<LiveSwitchResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) return NOT_ADMIN;

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('live_override')
    .update({ is_live: false, video_id: null, armed_until: null })
    .eq('id', 1);

  if (error) return { ok: false, error: `Falha a terminar a transmissão: ${error.message}` };

  revalidatePath('/admin/live');
  revalidatePath('/live');
  return { ok: true };
}
