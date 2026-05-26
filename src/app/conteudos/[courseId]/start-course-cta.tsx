import { redirect } from 'next/navigation';

import { signInWithGoogleAction } from '@/lib/auth/actions';
import { logCourseAccessAction } from '@/lib/courses/access-actions';

type StartCourseCtaProps = {
  courseId: string;
  firstLessonId: string;
  hasProgress: boolean;
  isAuthenticated: boolean;
};

const BUTTON_CLASS =
  'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none';

export function StartCourseCta({
  courseId,
  firstLessonId,
  hasProgress,
  isAuthenticated,
}: StartCourseCtaProps) {
  if (!isAuthenticated) {
    const next = `/conteudos/${courseId}/${firstLessonId}`;
    return (
      <form action={signInWithGoogleAction} className="mt-8 inline-block">
        <input type="hidden" name="next" value={next} />
        <button type="submit" className={BUTTON_CLASS}>
          Inicia sessão para começar →
        </button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        'use server';
        await logCourseAccessAction(courseId);
        redirect(`/conteudos/${courseId}/${firstLessonId}`);
      }}
      className="mt-8 inline-block"
    >
      <button type="submit" className={BUTTON_CLASS}>
        {hasProgress ? 'Continuar curso' : 'Começar curso'} →
      </button>
    </form>
  );
}
