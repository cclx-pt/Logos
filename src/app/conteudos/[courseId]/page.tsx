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

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completed = await getCompletedLessonIds(allLessonIds);

  const firstLesson = getFirstLessonOfCourse(course);
  const courseDone = isCourseComplete(course, completed);
  // Se o curso está concluído, garantimos que existe row em course_completions
  // (insert idempotente; RLS de PR2 torna-a imutável depois de inserida).
  // A data ali preservada é a primeira vez que o utilizador concluiu — mesmo
  // que depois desmarque uma aula e o `courseDone` fique false em visitas
  // subsequentes, a row continua na DB.
  const completedAt = courseDone ? await getOrCreateCourseCompletion(course.id) : null;

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
          isAuthenticated={user !== null}
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
            {course.modules.map((module, moduleIndex) => {
              const completedInModule = module.lessons.filter((l) => completed.has(l.id)).length;
              const total = module.lessons.length;
              const moduleDone = isModuleComplete(module, completed);

              return (
                <li key={module.id}>
                  <Link
                    href={`/conteudos/${course.id}/modulos/${module.id}`}
                    className="border-border bg-card hover:border-orange-primary/40 hover:bg-orange-primary/5 focus-visible:ring-ring group flex items-center justify-between gap-4 rounded-xl border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        Módulo {moduleIndex + 1}
                      </p>
                      <h3 className="font-display text-ink mt-1 text-xl font-medium tracking-tight">
                        {module.title}
                      </h3>
                      {module.description ? (
                        <p className="text-muted-foreground mt-2 line-clamp-2 max-w-prose text-sm leading-relaxed">
                          {module.description}
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
                        className="text-muted-foreground transition-transform group-hover:translate-x-1"
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
    </section>
  );
}
