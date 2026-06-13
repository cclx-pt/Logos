'use client';

import { useEffect, useRef } from 'react';

import { markThreadSeenAction } from './actions';

/**
 * Marca a conversa como vista quando o aluno abre a página (V3.6 PR5).
 *
 * Componente sem UI (devolve `null`): dispara `markThreadSeenAction` uma vez,
 * no cliente, depois do render do detalhe. Assim o highlight de "não lido"
 * (cabeçalho + lista) apaga no próximo carregamento. É best-effort - se a
 * marcação falhar, a conversa continua a ler-se na mesma. O `ref` evita disparos
 * repetidos em re-render (Strict Mode duplica o efeito em dev).
 */
export function MarkThreadSeen({ code }: { code: string }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    void markThreadSeenAction(code);
  }, [code]);
  return null;
}
