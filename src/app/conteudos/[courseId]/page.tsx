import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';
import { formatDate } from '@/lib/format';
import { CourseImage } from '@/lib/courses/course-image';
import { getCourseDetailById, getFirstLessonOfCourse } from '@/lib/courses/detail';
import {
  getCompletedLessonIds,
  getOrCreateCourseCompletion,
  isCourseComplete,
  isModuleComplete,
} from '@/lib/courses/completion';
import { getEnrollmentState } from '@/lib/courses/enrollment';
import { signInWithGoogleAction } from '@/lib/auth/actions';
import { EnrollCourseCta } from './enroll-course-cta';
import { UnenrollCourseLink } from './unenroll-course-link';
import { StartCourseCta } from './start-course-cta';

type PageProps = {
  params: Promise<{ courseId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) {
    return { title: 'Curso não encontrado · LOGOS' };
  }
  const course = await getCourseDetailById(courseId);
  if (!course) {
    return { title: 'Curso não encontrado · LOGOS' };
  }
  return {
    title: `${course.title} · LOGOS`,
    description: course.description ?? undefined,
  };
}

export default async function CoursePage({ params }: PageProps) {
  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) {
    notFound();
  }
  const course = await getCourseDetailById(courseId);
  if (!course) {
    notFound();
  }

  const user = await getCurrentUser();
  const enrollmentState = await getEnrollmentState(courseId);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-6 flex items-center gap-2 text-xs"
      >
        <Link href="/conteudos" className="hover:text-ink transition-colors">
          Conteúdos
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink line-clamp-1">{course.title}</span>
      </nav>

      <CourseImage
        bannerUrl={course.bannerUrl}
        iconSlug={course.icon}
        alt={course.title}
        variant="hero"
        className="mb-6"
      />
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight sm:text-4xl">
          {course.title}
        </h1>
        {course.description ? (
          <p className="text-muted-foreground mt-3 max-w-3xl text-justify font-sans text-base leading-relaxed hyphens-auto">
            {course.description}
          </p>
        ) : null}
      </header>

      {enrollmentState === 'anon' ? (
        <AnonCourseView courseId={course.id} />
      ) : enrollmentState === 'not-enrolled' ? (
        <NotEnrolledCourseView course={course} />
      ) : (
        <EnrolledCourseView course={course} userPresent={user !== null} />
      )}
    </section>
  );
}

/**
 * Vista anónima: banner + título + descrição (já renderizados acima) +
 * CTA de login. Não mostra módulos nem aulas — RLS de modules/lessons
 * também bloqueia caso o anon tente bypass.
 */
function AnonCourseView({ courseId }: { courseId: string }) {
  const next = `/conteudos/${courseId}`;
  return (
    <div className="border-orange-primary/30 bg-orange-primary/5 mt-10 rounded-2xl border p-6 sm:p-8">
      <p className="text-orange-primary text-xs font-semibold tracking-wide uppercase">
        Conteúdo para utilizadores
      </p>
      <p className="text-ink mt-2 max-w-prose text-base leading-relaxed sm:text-lg">
        Inicia sessão para aceder ao conteúdo deste curso e a mais cursos.
      </p>
      <form action={signInWithGoogleAction} className="mt-5">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium text-white focus-visible:ring-2 focus-visible:outline-none"
        >
          Inicia sessão com Google →
        </button>
      </form>
    </div>
  );
}

type CourseForView = Awaited<ReturnType<typeof getCourseDetailById>>;

/**
 * Vista "logado, não inscrito": mostra estrutura (módulos + aulas) em
 * read-only (não clicáveis) + CTA grande "Começar curso" para inscrever.
 */
function NotEnrolledCourseView({ course }: { course: NonNullable<CourseForView> }) {
  const hasAnyLesson = course.modules.some((m) => m.lessons.length > 0);

  return (
    <>
      {hasAnyLesson ? (
        <EnrollCourseCta courseId={course.id} />
      ) : (
        <p className="text-muted-foreground mt-8 inline-flex items-center rounded-md border border-dashed px-4 py-3 text-sm">
          Em breve — este curso ainda não tem aulas publicadas.
        </p>
      )}

      <section aria-labelledby="modulos-heading" className="mt-12">
        <h2
          id="modulos-heading"
          className="text-muted-foreground text-sm font-semibold tracking-wide uppercase"
        >
          Estrutura do curso
        </h2>
        {course.modules.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">Sem módulos ainda.</p>
        ) : (
          <ol className="mt-6 space-y-4">
            {course.modules.map((mod, moduleIndex) => (
              <li key={mod.id}>
                <article className="border-border bg-card rounded-xl border p-5">
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Módulo {moduleIndex + 1}
                  </p>
                  <h3 className="font-display text-ink mt-1 text-xl font-medium tracking-tight">
                    {mod.title}
                  </h3>
                  {mod.description ? (
                    <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
                      {mod.description}
                    </p>
                  ) : null}
                  {mod.lessons.length > 0 ? (
                    <ol className="border-border divide-border mt-4 divide-y overflow-hidden rounded-lg border">
                      {mod.lessons.map((lesson, lessonIndex) => (
                        <li
                          key={lesson.id}
                          className="text-muted-foreground flex items-center gap-3 p-3"
                        >
                          <span
                            aria-hidden="true"
                            className="border-border text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums"
                          >
                            {moduleIndex + 1}.{lessonIndex + 1}
                          </span>
                          <span className="text-ink line-clamp-1 flex-1 text-sm font-medium">
                            {lesson.title}
                          </span>
                          <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                            {lesson.template === 'video_pdf' ? 'vídeo + pdf' : 'pdf'}
                          </span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-muted-foreground mt-3 text-sm italic">
                      Sem aulas neste módulo.
                    </p>
                  )}
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

/**
 * Vista "inscrito": comportamento V3 actual. Aulas clicáveis, banner de
 * progresso, módulos como link cards. Adiciona link discreto "Sair do
 * curso" no fundo.
 */
async function EnrolledCourseView({
  course,
  userPresent,
}: {
  course: NonNullable<CourseForView>;
  userPresent: boolean;
}) {
  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completed = await getCompletedLessonIds(allLessonIds);

  const firstLesson = getFirstLessonOfCourse(course);
  const courseDone = isCourseComplete(course, completed);
  const completedAt = courseDone ? await getOrCreateCourseCompletion(course.id) : null;

  return (
    <>
      {courseDone ? (
        <div className="border-orange-primary/30 bg-orange-primary/5 mt-8 rounded-2xl border p-6">
          <p className="text-orange-primary text-xs font-semibold tracking-wide uppercase">
            ✓ Curso concluído
          </p>
          <p className="text-ink mt-2 text-base">
            Parabéns — concluíste todas as aulas deste curso
            {completedAt ? (
              <>
                {' '}
                em <strong>{formatDate(completedAt)}</strong>
              </>
            ) : null}
            .
          </p>
        </div>
      ) : firstLesson ? (
        <StartCourseCta
          courseId={course.id}
          firstLessonId={firstLesson.id}
          hasProgress={completed.size > 0}
          isAuthenticated={userPresent}
        />
      ) : (
        <p className="text-muted-foreground mt-8 inline-flex items-center rounded-md border border-dashed px-4 py-3 text-sm">
          Em breve — este curso ainda não tem aulas publicadas.
        </p>
      )}

      <section aria-labelledby="modulos-heading" className="mt-12">
        <h2
          id="modulos-heading"
          className="text-muted-foreground text-sm font-semibold tracking-wide uppercase"
        >
          Módulos
        </h2>
        {course.modules.length === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">Sem módulos ainda.</p>
        ) : (
          <ol className="mt-6 space-y-4">
            {course.modules.map((mod, moduleIndex) => {
              const completedInModule = mod.lessons.filter((l) => completed.has(l.id)).length;
              const total = mod.lessons.length;
              const moduleDone = isModuleComplete(mod, completed);

              return (
                <li key={mod.id}>
                  <Link
                    href={`/conteudos/${course.id}/modulos/${mod.id}`}
                    className="border-border bg-card hover:border-orange-primary/40 hover:bg-orange-primary/5 focus-visible:ring-ring group flex items-center justify-between gap-4 rounded-xl border p-5 focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Módulo {moduleIndex + 1}
                      </p>
                      <h3 className="font-display text-ink mt-1 text-xl font-medium tracking-tight">
                        {mod.title}
                      </h3>
                      {mod.description ? (
                        <p className="text-muted-foreground mt-2 line-clamp-2 max-w-prose text-sm leading-relaxed">
                          {mod.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {total > 0 ? (
                        <span
                          className={
                            moduleDone
                              ? 'text-orange-primary text-xs font-medium tabular-nums'
                              : 'text-muted-foreground text-xs tabular-nums'
                          }
                        >
                          {completedInModule}/{total}
                        </span>
                      ) : null}
                      {moduleDone && (
                        <Check
                          aria-label="Módulo concluído"
                          className="text-orange-primary h-5 w-5"
                        />
                      )}
                      <span
                        aria-hidden="true"
                        className="text-muted-foreground group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <UnenrollCourseLink courseId={course.id} />
    </>
  );
}
