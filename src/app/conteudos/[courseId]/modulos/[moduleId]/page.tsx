import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { Check } from 'lucide-react';

import { UUID_RE } from '@/lib/validation';
import { getCourseDetailById } from '@/lib/courses/detail';
import {
  getCompletedLessonIds,
  getNextModuleWithLessons,
  isModuleComplete,
} from '@/lib/courses/completion';
import { getEnrollmentState } from '@/lib/courses/enrollment';

type PageProps = {
  params: Promise<{ courseId: string; moduleId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { courseId, moduleId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(moduleId)) {
    return { title: 'Módulo não encontrado · LOGOS' };
  }
  const course = await getCourseDetailById(courseId);
  const mod = course?.modules.find((m) => m.id === moduleId);
  if (!course || !mod) {
    return { title: 'Módulo não encontrado · LOGOS' };
  }
  return {
    title: `${mod.title} · ${course.title} · LOGOS`,
    description: mod.description ?? undefined,
  };
}

export default async function CourseModulePage({ params }: PageProps) {
  const { courseId, moduleId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(moduleId)) {
    notFound();
  }

  // Enrollment gate (V3.3 PR8): só utilizadores inscritos vêem páginas de módulo.
  // Anon e logado-não-inscrito caem na landing do curso (que tem CTA apropriada).
  const enrollmentState = await getEnrollmentState(courseId);
  if (enrollmentState !== 'enrolled') {
    redirect(`/conteudos/${courseId}`);
  }

  const course = await getCourseDetailById(courseId);
  if (!course) {
    notFound();
  }
  const moduleIndex = course.modules.findIndex((m) => m.id === moduleId);
  if (moduleIndex === -1) {
    notFound();
  }
  const mod = course.modules[moduleIndex];

  const allLessonIds = course.modules.flatMap((m) => m.lessons.map((l) => l.id));
  const completed = await getCompletedLessonIds(allLessonIds);

  const moduleDone = isModuleComplete(mod, completed);
  const completedInModule = mod.lessons.filter((l) => completed.has(l.id)).length;
  const total = mod.lessons.length;
  const nextModule = getNextModuleWithLessons(course, mod.id);
  const firstOfNext = nextModule?.lessons[0];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-6 flex flex-wrap items-center gap-2 text-xs"
      >
        <Link href="/conteudos" className="hover:text-ink transition-colors">
          Conteúdos
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={`/conteudos/${course.id}`}
          className="hover:text-ink line-clamp-1 transition-colors"
        >
          {course.title}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink line-clamp-1">Módulo {moduleIndex + 1}</span>
      </nav>

      <header>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Módulo {moduleIndex + 1} de {course.modules.length}
        </p>
        <h1 className="font-display text-ink mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
          {mod.title}
        </h1>
        {mod.description ? (
          <p className="text-muted-foreground mt-4 max-w-prose text-justify font-sans text-base leading-relaxed hyphens-auto">
            {mod.description}
          </p>
        ) : null}
        {total > 0 ? (
          <p className="text-muted-foreground mt-4 inline-flex items-center gap-2 text-xs tracking-wide uppercase">
            <span
              className={
                moduleDone
                  ? 'text-orange-primary font-medium tabular-nums'
                  : 'text-muted-foreground tabular-nums'
              }
            >
              {completedInModule}/{total} concluídas
            </span>
            {moduleDone && (
              <>
                <Check aria-label="Módulo concluído" className="text-orange-primary h-4 w-4" />
                <span className="text-orange-primary font-medium">Módulo concluído</span>
              </>
            )}
          </p>
        ) : null}
      </header>

      <section aria-labelledby="aulas-heading" className="mt-10">
        <h2
          id="aulas-heading"
          className="text-muted-foreground text-sm font-semibold tracking-wide uppercase"
        >
          Aulas
        </h2>
        {total === 0 ? (
          <p className="text-muted-foreground mt-4 text-sm">Sem aulas neste módulo.</p>
        ) : (
          <ol className="border-border divide-border mt-4 divide-y overflow-hidden rounded-lg border">
            {mod.lessons.map((lesson, lessonIndex) => {
              const isDone = completed.has(lesson.id);
              return (
                <li key={lesson.id}>
                  <Link
                    href={`/conteudos/${course.id}/${lesson.id}`}
                    className="hover:bg-orange-primary/5 focus-visible:ring-ring flex items-center gap-3 p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={
                        isDone
                          ? 'bg-orange-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white'
                          : 'border-border text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs tabular-nums'
                      }
                    >
                      {isDone ? <Check className="h-4 w-4" /> : lessonIndex + 1}
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
      </section>

      {moduleDone && firstOfNext && nextModule && (
        <div className="border-orange-primary/30 bg-orange-primary/5 mt-10 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-6">
          <div className="min-w-0">
            <p className="text-orange-primary text-xs font-semibold tracking-wide uppercase">
              ✓ Módulo concluído
            </p>
            <p className="text-ink mt-1 text-sm">
              Pronto para o próximo? <strong>{nextModule.title}</strong>
            </p>
          </div>
          <Link
            href={`/conteudos/${course.id}/modulos/${nextModule.id}`}
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Próximo módulo →
          </Link>
        </div>
      )}

      <nav
        aria-label="Voltar ao curso"
        className="border-border mt-12 flex justify-start border-t pt-6"
      >
        <Link
          href={`/conteudos/${course.id}`}
          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          ← Voltar ao curso
        </Link>
      </nav>
    </section>
  );
}
