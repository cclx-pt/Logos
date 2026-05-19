import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCourseDetailBySlug, getLessonDetailById, getLessonNavigation } from '@/lib/courses/detail';
import { extractYoutubeId } from '@/lib/courses/youtube';
import { PdfDownloadButton } from './pdf-download-button';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ slug: string; lessonId: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lessonId } = await params;
  if (!UUID_RE.test(lessonId)) {
    return { title: 'Aula não encontrada · LOGOS' };
  }
  const lesson = await getLessonDetailById(lessonId);
  if (!lesson) {
    return { title: 'Aula não encontrada · LOGOS' };
  }
  return {
    title: `${lesson.title} · ${lesson.course.title} · LOGOS`,
    description: lesson.description ?? undefined,
  };
}

export default async function LessonPage({ params }: PageProps) {
  const { slug, lessonId } = await params;
  if (!UUID_RE.test(lessonId)) {
    notFound();
  }

  const [lesson, course] = await Promise.all([
    getLessonDetailById(lessonId),
    getCourseDetailBySlug(slug),
  ]);

  if (!lesson || !course || lesson.course.slug !== slug) {
    notFound();
  }

  const nav = getLessonNavigation(course, lesson.id);
  const youtubeId =
    lesson.template === 'video_pdf' ? extractYoutubeId(lesson.youtube_url) : null;

  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground mb-6 flex flex-wrap items-center gap-2 text-xs"
      >
        <Link href="/conteudos" className="hover:text-ink transition-colors">
          Conteúdos
        </Link>
        <span aria-hidden="true">›</span>
        <Link
          href={`/conteudos/${course.slug}`}
          className="hover:text-ink line-clamp-1 transition-colors"
        >
          {course.title}
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink line-clamp-1">{lesson.title}</span>
      </nav>

      <header>
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {lesson.module.title}
        </p>
        <h1 className="font-display text-ink mt-2 text-3xl font-medium tracking-tight sm:text-4xl">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <p className="text-muted-foreground mt-4 max-w-3xl text-justify font-sans text-base leading-relaxed hyphens-auto">
            {lesson.description}
          </p>
        ) : null}
      </header>

      {youtubeId ? (
        <div className="border-border bg-card mt-8 aspect-video w-full overflow-hidden rounded-2xl border">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
            title={`Vídeo: ${lesson.title}`}
            loading="lazy"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : lesson.template === 'video_pdf' ? (
        <p className="text-muted-foreground mt-8 inline-flex items-center rounded-md border border-dashed px-4 py-3 text-sm">
          O vídeo desta aula não está disponível.
        </p>
      ) : null}

      <div className="mt-8">
        <PdfDownloadButton lessonId={lesson.id} lessonTitle={lesson.title} />
      </div>

      <nav
        aria-label="Navegação entre aulas"
        className="border-border mt-12 flex flex-wrap items-stretch justify-between gap-3 border-t pt-6"
      >
        {nav.previous ? (
          <Link
            href={`/conteudos/${course.slug}/${nav.previous.id}`}
            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex max-w-full flex-1 flex-col items-start gap-1 rounded-md border px-4 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:max-w-[48%]"
          >
            <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
              ← Aula anterior
            </span>
            <span className="line-clamp-2 text-sm font-medium">{nav.previous.title}</span>
          </Link>
        ) : (
          <span className="flex-1 sm:max-w-[48%]" aria-hidden="true" />
        )}
        {nav.next ? (
          <Link
            href={`/conteudos/${course.slug}/${nav.next.id}`}
            className="border-orange-primary/30 bg-orange-primary/5 text-ink hover:bg-orange-primary/10 focus-visible:ring-ring inline-flex max-w-full flex-1 flex-col items-end gap-1 rounded-md border px-4 py-3 text-right transition-colors focus-visible:ring-2 focus-visible:outline-none sm:max-w-[48%]"
          >
            <span className="text-orange-primary text-[10px] tracking-wide uppercase">
              Próxima aula →
            </span>
            <span className="line-clamp-2 text-sm font-medium">{nav.next.title}</span>
          </Link>
        ) : (
          <Link
            href={`/conteudos/${course.slug}`}
            className="border-orange-primary/30 bg-orange-primary/5 text-ink hover:bg-orange-primary/10 focus-visible:ring-ring inline-flex max-w-full flex-1 flex-col items-end gap-1 rounded-md border px-4 py-3 text-right transition-colors focus-visible:ring-2 focus-visible:outline-none sm:max-w-[48%]"
          >
            <span className="text-orange-primary text-[10px] tracking-wide uppercase">
              Voltar ao curso →
            </span>
            <span className="line-clamp-2 text-sm font-medium">{course.title}</span>
          </Link>
        )}
      </nav>

      <section aria-labelledby="indice-curso-heading" className="mt-16">
        <h2
          id="indice-curso-heading"
          className="text-muted-foreground text-sm font-semibold tracking-wide uppercase"
        >
          Índice do curso
        </h2>
        <ol className="mt-6 space-y-6">
          {course.modules.map((module, moduleIndex) => (
            <li key={module.id}>
              <details
                open={module.id === lesson.module.id}
                className="border-border bg-card group rounded-lg border p-4"
              >
                <summary className="text-ink flex cursor-pointer list-none items-baseline justify-between gap-3 rounded-md outline-none">
                  <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-xs tracking-wide uppercase">
                      Módulo {moduleIndex + 1}
                    </p>
                    <p className="text-ink mt-1 text-sm font-medium">{module.title}</p>
                  </div>
                  <span
                    aria-hidden="true"
                    className="text-muted-foreground transition-transform group-open:rotate-180"
                  >
                    ▾
                  </span>
                </summary>
                {module.lessons.length === 0 ? (
                  <p className="text-muted-foreground mt-3 text-xs">Sem aulas neste módulo.</p>
                ) : (
                  <ol className="mt-3 space-y-1">
                    {module.lessons.map((l, lessonIndex) => {
                      const isCurrent = l.id === lesson.id;
                      return (
                        <li key={l.id}>
                          <Link
                            href={`/conteudos/${course.slug}/${l.id}`}
                            aria-current={isCurrent ? 'page' : undefined}
                            className={
                              isCurrent
                                ? 'bg-orange-primary/10 text-orange-primary flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm font-medium'
                                : 'text-ink hover:bg-muted/40 focus-visible:ring-ring flex items-baseline gap-3 rounded-md px-2 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                            }
                          >
                            <span className="text-muted-foreground min-w-[1.5rem] text-xs tabular-nums">
                              {lessonIndex + 1}.
                            </span>
                            <span className="line-clamp-1">{l.title}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                )}
              </details>
            </li>
          ))}
        </ol>
      </section>
    </article>
  );
}
