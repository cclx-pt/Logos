import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { CourseIcon } from '@/lib/courses/icons';
import { getCourseDetailBySlug, getFirstLessonOfCourse } from '@/lib/courses/detail';

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

  const firstLesson = getFirstLessonOfCourse(course);
  const ctaLabel = 'Começar curso';

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
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

      {firstLesson ? (
        <Link
          href={`/conteudos/${course.slug}/${firstLesson.id}`}
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring mt-8 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          {ctaLabel} →
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
          <ol className="mt-6 space-y-8">
            {course.modules.map((module, moduleIndex) => (
              <li key={module.id} className="border-border bg-card rounded-2xl border p-6">
                <header>
                  <p className="text-muted-foreground text-xs tracking-wide uppercase">
                    Módulo {moduleIndex + 1}
                  </p>
                  <h3 className="font-display text-ink mt-1 text-2xl font-medium tracking-tight">
                    {module.title}
                  </h3>
                  {module.description ? (
                    <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
                      {module.description}
                    </p>
                  ) : null}
                </header>
                {module.lessons.length === 0 ? (
                  <p className="text-muted-foreground mt-4 text-sm">Sem aulas neste módulo.</p>
                ) : (
                  <ol className="border-border divide-border mt-4 divide-y overflow-hidden rounded-lg border">
                    {module.lessons.map((lesson, lessonIndex) => (
                      <li key={lesson.id}>
                        <Link
                          href={`/conteudos/${course.slug}/${lesson.id}`}
                          className="hover:bg-orange-primary/5 focus-visible:ring-ring flex items-start gap-4 p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <span className="text-muted-foreground min-w-[2rem] text-sm font-medium tabular-nums">
                            {lessonIndex + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-ink font-medium">{lesson.title}</p>
                            <p className="text-muted-foreground mt-0.5 text-xs">
                              {lesson.template === 'video_pdf' ? 'Vídeo + apostila' : 'Apostila'}
                            </p>
                          </div>
                          <span className="text-orange-primary hidden text-xs font-medium tracking-wide uppercase sm:inline">
                            Abrir →
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}
