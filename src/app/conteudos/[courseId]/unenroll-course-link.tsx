import { redirect } from 'next/navigation';

import { unenrollAction } from '@/lib/courses/enrollment';

type Props = {
  courseId: string;
};

/**
 * Link discreto "Sair do curso" no fundo da vista "inscrito". Não é botão
 * primário — saída de um curso não é uma acção comum, então fica
 * intencionalmente afastada do CTA principal de progresso e estilizada
 * como link de texto.
 *
 * Progresso (`lesson_completions`) preserva-se. Re-inscrever-se via
 * "Começar curso" mostra as aulas já marcadas.
 */
export function UnenrollCourseLink({ courseId }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        const result = await unenrollAction(courseId);
        if (!result.ok) {
          return;
        }
        redirect(`/conteudos/${courseId}`);
      }}
      className="border-border mt-16 border-t pt-8"
    >
      <button
        type="submit"
        className="border-destructive/50 text-ink hover:border-destructive hover:text-destructive hover:bg-destructive/5 focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md border px-5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        Sair do curso
      </button>
      <p className="text-muted-foreground mt-3 max-w-prose text-sm">
        Tira o curso da tua lista. O teu progresso é preservado - voltas a vê-lo se te inscreveres
        outra vez.
      </p>
    </form>
  );
}
