'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

/**
 * Convite de 1.ª visita para o tutorial. Aparece uma vez **por utilizador**
 * (flag em localStorage com o id na chave) e liga à página `/como-funciona`.
 * Dispensável.
 *
 * A chave leva o `userId` para o convite aparecer no 1.º login de cada conta,
 * mesmo num browser onde outra conta já o dispensou (antes era uma flag única
 * por browser, pelo que nunca reaparecia depois da 1.ª vez).
 *
 * Lê o localStorage via `useSyncExternalStore` para ser SSR-safe: o servidor
 * usa o snapshot "já visto" (renderiza `null`, sem banner), e o cliente lê o
 * valor real sem mismatch de hidratação. O `dismiss` grava a flag e dispara um
 * evento para o store re-ler e esconder.
 */
const SEEN_KEY_PREFIX = 'logos.tutorial.seen';
const SEEN_EVENT = 'logos:tutorial-seen';

/** Chave de localStorage do convite, isolada por utilizador. */
export function tutorialSeenKey(userId: string): string {
  return `${SEEN_KEY_PREFIX}.${userId}`;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(SEEN_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SEEN_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export function FirstVisitTutorial({ userId }: { userId: string }) {
  const key = tutorialSeenKey(userId);

  const getSnapshot = useCallback((): boolean => {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      // localStorage indisponível (modo privado severo): tratar como "já visto".
      return true;
    }
  }, [key]);

  // Snapshot do servidor = true (já visto) -> nada renderizado no SSR.
  const seen = useSyncExternalStore(subscribe, getSnapshot, () => true);

  function dismiss() {
    try {
      localStorage.setItem(key, '1');
    } catch {
      // ignora
    }
    window.dispatchEvent(new Event(SEEN_EVENT));
  }

  if (seen) return null;

  return (
    <div
      role="dialog"
      aria-label="Bem-vindo ao LOGOS"
      className="border-border bg-card fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-2xl border p-5 shadow-lg sm:right-6 sm:left-auto sm:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="text-muted-foreground hover:text-ink focus-visible:ring-ring absolute top-3 right-3 rounded-md p-1 transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
      <h2 className="font-display text-ink pr-6 text-xl font-medium">Bem-vindo ao LOGOS</h2>
      <p className="text-muted-foreground mt-2 font-sans text-sm leading-relaxed">
        É a tua primeira vez aqui? Vê um tour rápido das principais funcionalidades.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <Link
          href="/como-funciona"
          onClick={dismiss}
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-4 font-sans text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Ver tutorial
        </Link>
        <button
          type="button"
          onClick={dismiss}
          className="text-muted-foreground hover:text-ink focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 font-sans text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Agora não
        </button>
      </div>
    </div>
  );
}
