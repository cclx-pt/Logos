import { Download } from 'lucide-react';

import { cn } from '@/lib/utils';

type Props = {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
};

/**
 * PdfDownloadButton — `<a>` simples para o route handler
 * `/conteudos/[courseId]/[lessonId]/sebenta?dl=1`, que serve o PDF com
 * `Content-Disposition: attachment`. O atributo `download` (rota same-origin)
 * reforça o download.
 *
 * Era um botão que fazia `window.open(url)` **depois** de um `await` à Server
 * Action. Em mobile (sobretudo iOS Safari) o bloqueador de popups só deixa
 * abrir uma nova janela durante o gesto síncrono do toque; após o await esse
 * gesto já não conta e o download falhava em silêncio. Uma navegação real por
 * `<a>` não tem esse problema e funciona em todos os dispositivos.
 */
export function PdfDownloadButton({ courseId, lessonId, lessonTitle }: Props) {
  return (
    <a
      href={`/conteudos/${courseId}/${lessonId}/sebenta?dl=1`}
      download=""
      aria-label={`Descarregar sebenta de ${lessonTitle}`}
      className={cn(
        'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none',
      )}
    >
      <Download aria-hidden="true" className="h-4 w-4" />
      <span>Descarregar sebenta</span>
    </a>
  );
}
