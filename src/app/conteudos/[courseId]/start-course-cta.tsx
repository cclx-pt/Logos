import { redirect } from 'next/navigation';

import { ProviderSignIn } from '@/components/site/provider-sign-in';
import { logCourseAccessAction } from '@/lib/courses/access-actions';

type StartCourseCtaProps = {
  courseId: string;
  /** Aula de destino: primeira aula do curso ou, havendo progresso, a primeira não concluída. */
  lessonId: string;
  lessonTitle: string;
  hasProgress: boolean;
  isAuthenticated: boolean;
};

const BUTTON_CLASS =
  'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex min-h-11 flex-col items-start justify-center gap-0.5 rounded-md px-6 py-2.5 text-left text-white transition-colors focus-visible:ring-2 focus-visible:outline-none';

export function StartCourseCta({
  courseId,
  lessonId,
  lessonTitle,
  hasProgress,
  isAuthenticated,
}: StartCourseCtaProps) {
  if (!isAuthenticated) {
    const next = `/conteudos/${courseId}/${lessonId}`;
    return <ProviderSignIn next={next} className="mt-8" />;
  }

  return (
    <form
      action={async () => {
        'use server';
        await logCourseAccessAction(courseId);
        redirect(`/conteudos/${courseId}/${lessonId}`);
      }}
      className="mt-8 inline-block"
    >
      <button type="submit" className={BUTTON_CLASS}>
        <span className="text-sm font-medium">
          {hasProgress ? 'Continuar curso' : 'Começar curso'} →
        </span>
        {/* Nome da aula que se vai ver a seguir — dá contexto ao clique. */}
        <span className="line-clamp-1 max-w-72 text-xs font-normal text-white/85 sm:max-w-96">
          {hasProgress ? 'A seguir' : 'Primeira aula'}: {lessonTitle}
        </span>
      </button>
    </form>
  );
}
