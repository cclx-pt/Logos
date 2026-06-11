import { Plus } from 'lucide-react';
import { redirect } from 'next/navigation';

import { enrollAction } from '@/lib/courses/enrollment';

type Props = {
  courseId: string;
};

/**
 * CTA "Adicionar a Meus cursos" — usado na vista "logado, não inscrito" do
 * `/conteudos/[courseId]`. Em sucesso, `revalidatePath` no enrollAction
 * faz a página re-render como "inscrito" (clickable modules + lessons).
 *
 * Copy deliberadamente distinta de "Começar curso" (CTA da vista inscrita):
 * inscrever não navega para nenhuma aula, acrescenta o curso a /meus-cursos.
 *
 * Em erro, redireccionamos com `?erro=generico` para o `<SaveToastListener />`
 * apanhar e mostrar toast. O listener só está montado no layout admin —
 * para a parte pública precisamos de o mover ou fazer fallback silencioso.
 * Por agora: erro só re-renderiza a página (utilizador vê que continua não
 * inscrito) — V3.3 PR8 aceita este trade-off (raro caso).
 */
export function EnrollCourseCta({ courseId }: Props) {
  return (
    <form
      action={async () => {
        'use server';
        const result = await enrollAction(courseId);
        if (!result.ok) {
          // Fallback silencioso — revalidation no enrollAction trata UI re-render.
          return;
        }
        redirect(`/conteudos/${courseId}`);
      }}
      className="mt-8 inline-block"
    >
      <button
        type="submit"
        className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-2 rounded-md px-6 text-sm font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        Adicionar a “Meus cursos”
      </button>
    </form>
  );
}
