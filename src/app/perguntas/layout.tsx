import { Suspense, type ReactNode } from 'react';

import { SaveToastListener } from '@/components/ui/save-toast-listener';

/**
 * Layout do segmento `/perguntas` (vista do aluno). Monta o
 * `<SaveToastListener />` - que de outro modo só vive no layout admin - para os
 * toasts de `?guardado=`/`?erro=` funcionarem nesta parte pública (envio de
 * seguimento). O guard de sessão fica em cada página (o destino do `next`
 * difere entre a lista e o detalhe).
 */
export default function PerguntasLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Suspense fallback={null}>
        <SaveToastListener />
      </Suspense>
    </>
  );
}
