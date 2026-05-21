'use client';

import { useState, useTransition } from 'react';
import { Download } from 'lucide-react';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { getLessonPdfSignedUrlAction } from '@/lib/courses/access-actions';

type Props = {
  lessonId: string;
  lessonTitle: string;
};

/**
 * PdfDownloadButton — Client Component que pede uma URL assinada à
 * Server Action e abre o PDF em nova aba. URL é válida 5 min, gerada
 * on-demand para preservar o acesso restrito ao bucket privado.
 *
 * Estados visuais:
 *   - idle: ícone + label "Descarregar apostila"
 *   - pending: Spinner + label "A preparar PDF…"
 *   - error: mensagem inline (raro; RLS já filtra aulas inacessíveis)
 */
export function PdfDownloadButton({ lessonId, lessonTitle }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await getLessonPdfSignedUrlAction(lessonId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Abrir em nova aba — o browser cuida do download (Content-Disposition do
      // Supabase Storage para application/pdf abre o viewer por defeito).
      window.open(result.url, '_blank', 'noopener,noreferrer');
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-busy={pending || undefined}
        aria-label={`Descarregar apostila de ${lessonTitle}`}
        className={cn(
          'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:opacity-70',
        )}
      >
        {pending ? (
          <>
            <Spinner className="text-white" label="A preparar PDF" />
            <span>A preparar PDF…</span>
          </>
        ) : (
          <>
            <Download aria-hidden="true" className="h-4 w-4" />
            <span>Descarregar apostila</span>
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="text-destructive text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
