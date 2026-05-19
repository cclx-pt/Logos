import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Check } from 'lucide-react';

import { CourseIcon } from '@/lib/courses/icons';
import { getCourseDetailBySlug, getFirstLessonOfCourse } from '@/lib/courses/detail';
import {
  getCompletedLessonIds,
  getNextModuleWithLessons,
  isCourseComplete,
  isModuleComplete,
} from '@/lib/courses/completion';

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = await getCourseDetailBySlug(slug);
  if (!course) {
    return { title: 'Curso não encontrado · LOGOS' };
  }
  return {
    title: `${course.title} · LOGOS`,
    description: course.description ?? undefined,
  };
}

export default async function CoursePage({ params }: PageProps) {
  const { slug } = await params;
  const course = await getCourseDetailBySlug(slug);
  if (!course) {
    notFound();
  }

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completed = await getCompletedLessonIds(allLessonIds);

  const firstLesson = getFirstLessonOfCourse(course);
  const courseDone = isCourseComplete(course, completed);

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <nav aria-label="Breadcrumb" className="text-muted-foreground mb-6 flex items-center gap-2 text-xs">
        <Link href="/conteudos" className="hover:text-ink transition-colors">
          Conteúdos
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink line-clamp-1">{course.title}</span>
      </nav>

      <header className="flex flex-col items-start gap-6 sm:flex-row sm:items-start">
        <div className="bg-orange-primary/10 text-orange-primary flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl">
          <CourseIcon slug={course.icon} className="h-8 w-8" />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight sm:text-4xl">
            {course.title}
          </h1>
          {course.description ? (
            <p className="text-muted-foreground mt-3 max-w-3xl text-justify font-sans text-base leading-relaxed hyphens-auto">
              {course.description}
            </p>
          ) : null}
        </div>
      </header>

      {courseDone ? (
        <div className="border-orange-primary/30 bg-orange-primary/5 mt-8 rounded-2xl border p-6">
          <p className="text-orange-primary text-xs font-semibold tracking-wide uppercase">
            ✓ Curso concluído
          </p>
          <p className="text-ink mt-2 text-base">
            Parabéns — concluíste todas as aulas deste curso.
          </p>
        </div>
      ) : firstLesson ? (
        <Link
          href={`/conteudos/${course.slug}/${firstLesson.id}`}
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring mt-8 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {completed.size > 0 ? 'Continuar curso' : 'Começar curso'} →
        </Link>
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
              const nextModule = getNextModuleWithLessons(course, module.id);
              const firstOfNext = nextModule?.lessons[0];

              return (
                <li key={module.id}>
                  <details className="border-border bg-card group rounded-xl border p-5 transition-colors open:shadow-sm">
                    <summary className="text-ink flex cursor-pointer list-none items-center justify-between gap-4 rounded-md outline-none">
                      <div className="min-w-0 flex-1">
                        <p className="text-muted-foreground text-xs tracking-wide uppercase">
                          Módulo {moduleIndex + 1}
                        </p>
                        <h3 className="font-display text-ink mt-1 text-xl font-medium tracking-tight">
                          {module.title}
                        </h3>
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
                          className="text-muted-foreground transition-transform group-open:rotate-180"
                        >
                          ▾
                        </span>
                      </div>
                    </summary>

                    {module.description ? (
                      <p className="text-muted-foreground mt-3 max-w-prose text-sm leading-relaxed">
                        {module.description}
                      </p>
                    ) : null}

                    {module.lessons.length === 0 ? (
                      <p className="text-muted-foreground mt-3 text-sm">Sem aulas neste módulo.</p>
                    ) : (
                      <ol className="border-border divide-border mt-4 divide-y overflow-hidden rounded-lg border">
                        {module.lessons.map((lesson, lessonIndex) => {
                          const isDone = completed.has(lesson.id);
                          return (
                            <li key={lesson.id}>
                              <Link
                                href={`/conteudos/${course.slug}/${lesson.id}`}
                                className="hover:bg-orange-primary/5 focus-visible:ring-ring flex items-center gap-3 p-3 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                              >
                                <span
                                  aria-hidden="true"
                                  className={
                                    isDone
                                      ? 'bg-orange-primary text-white flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs'
                                      : 'border-border text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums'
                                  }
                                >
                                  {isDone ? <Check className="h-3.5 w-3.5" /> : lessonIndex + 1}
                                </span>
                                <span
                                  className={
                                    isDone
                                      ? 'text-muted-foreground line-clamp-1 flex-1 text-sm line-through'
                                      : 'text-ink line-clamp-1 flex-1 text-sm font-medium'
                                  }
                                >
                                  {lesson.title}
                                </span>
                                <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                                  {lesson.template === 'video_pdf' ? 'vídeo + pdf' : 'pdf'}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ol>
                    )}

                    {moduleDone && firstOfNext && (
                      <div className="border-orange-primary/30 bg-orange-primary/5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border p-4">
                        <p className="text-ink text-sm">
                          Módulo concluído. Pronto para o próximo?
                        </p>
                        <Link
                          href={`/conteudos/${course.slug}/${firstOfNext.id}`}
                          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-4 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Próximo módulo →
                        </Link>
                      </div>
                    )}
                    {moduleDone && !firstOfNext && !courseDone && (
                      <p className="text-muted-foreground mt-4 text-sm">
                        Último módulo concluído.
                      </p>
                    )}
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </section>
  );
}
