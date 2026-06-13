'use client';

import { useEffect, useState } from 'react';
import type { LiveStatus } from './live-status';

const POLL_INTERVAL_MS = 60_000;
const ENDPOINT = '/api/youtube/live-status';

export type UseLiveStatus = {
  status: LiveStatus | null;
  /** `true` até à primeira resposta (ou enquanto não há `initialStatus`). */
  loading: boolean;
};

/**
 * Faz polling ao nosso endpoint de estado live a cada 60s (spec §6.1).
 * Em erro de rede, mantém o último estado conhecido (não força offline no
 * cliente; o fail-safe vive no servidor). Aceita um `initialStatus` opcional
 * vindo do render no servidor para evitar flash.
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

    return () => {
      active = false;
      controller.abort();
      clearInterval(id);
    };
  }, []);

  return { status, loading };
}
