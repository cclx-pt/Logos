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
        className="text-muted-foreground hover:text-destructive focus-visible:ring-ring inline-flex items-center rounded-sm text-xs font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
      >
        Sair do curso
      </button>
      <p className="text-muted-foreground mt-2 max-w-prose text-xs">
        Tira o curso da tua lista. O teu progresso é preservado — voltas a vê-lo se te
        inscreveres outra vez.
      </p>
    </form>
  );
}
