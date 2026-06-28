/**
 * Estado live do canal LOGOS, exposto ao cliente.
 *
 * O cliente faz polling a ESTE endpoint (barato, sem quota YouTube), nunca à
 * API do YouTube. A chave da API e a lógica de janelas/cache ficam no servidor
 * (`@/lib/youtube/live-status`). Resposta sempre `live:false` em caso de dúvida
 * (fail-safe). Ver `feature-docs/live.md`.
 */
import { NextResponse } from 'next/server';
import { getLiveStatus, type LiveStatus } from '@/lib/youtube/live-status';

// O gating por janela depende da hora atual: a rota tem de ser dinâmica.
// A proteção de quota vem da cache do `fetch` interno (Next.js Data Cache),
// não da cache da rota.
export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse<LiveStatus>> {
  const status = await getLiveStatus();
  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
