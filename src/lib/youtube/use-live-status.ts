'use client';

import { useEffect, useState } from 'react';
import { subscribeToTable } from '@/lib/auth/browser-client';
import type { LiveStatus } from './live-status';

const POLL_INTERVAL_MS = 60_000;
const ENDPOINT = '/api/youtube/live-status';

export type UseLiveStatus = {
  status: LiveStatus | null;
  /** `true` até à primeira resposta (ou enquanto não há `initialStatus`). */
  loading: boolean;
};

/**
 * Estado da transmissão em direto no cliente.
 *
 * Caminho rápido (V3.6): Supabase Realtime na tabela `live_override`. Quando o
 * admin liga/desliga o interruptor, todos os clientes recebem o evento e fazem
 * refetch imediato - o leitor e o botão "Live" mudam em <1s, sem recarregar.
 *
 * Backstop: polling a cada 60s ao nosso endpoint. Cobre (a) o fim da emissão
 * detetado por `videos.list` no servidor mesmo que o admin se esqueça de
 * carregar em "Terminámos", e (b) qualquer falha de entrega do Realtime.
 *
 * Em erro de rede, mantém o último estado conhecido (o fail-safe vive no
 * servidor). Aceita um `initialStatus` opcional do render no servidor (sem flash).
 */
export function useLiveStatus(initialStatus: LiveStatus | null = null): UseLiveStatus {
  const [status, setStatus] = useState<LiveStatus | null>(initialStatus);
  const [loading, setLoading] = useState(initialStatus === null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function poll() {
      try {
        const res = await fetch(ENDPOINT, { signal: controller.signal, cache: 'no-store' });
        if (!res.ok) return;
        const data: LiveStatus = await res.json();
        if (active) setStatus(data);
      } catch {
        // Ignora erros transitórios; mantém o último estado conhecido.
      } finally {
        if (active) setLoading(false);
      }
    }

    void poll();
    const id = setInterval(() => void poll(), POLL_INTERVAL_MS);

    // Caminho rápido: refetch imediato quando o interruptor `live_override` muda.
    let unsubscribe: (() => void) | null = null;
    try {
      unsubscribe = subscribeToTable('live_override', () => void poll());
    } catch {
      // Sem Realtime (env/erro): o polling de 60s é o backstop.
    }

    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
      unsubscribe?.();
    };
  }, []);

  return { status, loading };
}
