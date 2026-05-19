import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  getCourseDetailBySlug,
  getLessonDetailById,
  getLessonNavigation,
} from '@/lib/courses/detail';
import { extractYoutubeId } from '@/lib/courses/youtube';
import { getLessonPdfSignedUrlAction } from '@/lib/courses/access-actions';
import {
  getCompletedLessonIds,
  getNextModuleWithLessons,
  isModuleComplete,
} from '@/lib/courses/completion';
import { PdfDownloadButton } from './pdf-download-button';
import { MarkCompleteButton } from './mark-complete-button';

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

  // Estado de conclusão para esta aula + todas as do módulo actual (para
  // detectar "módulo completo → próximo módulo").
  const moduleLessonIds = course.modules
    .find((m) => m.id === lesson.module.id)
    ?.lessons.map((l) => l.id) ?? [];
  const completed = await getCompletedLessonIds(moduleLessonIds);

  const currentModule = course.modules.find((m) => m.id === lesson.module.id) ?? null;
  const moduleDone = currentModule ? isModuleComplete(currentModule, completed) : false;
  const isLastInModule =
    currentModule && currentModule.lessons[currentModule.lessons.length - 1]?.id === lesson.id;
  const nextModule = getNextModuleWithLessons(course, lesson.module.id);

  const nav = getLessonNavigation(course, lesson.id);

  // Vídeo (template = video_pdf)
  const youtubeId =
    lesson.template === 'video_pdf' ? extractYoutubeId(lesson.youtube_url) : null;

  // PDF inline: gera URL assinada server-side. Passamos ao iframe via prop.
  // RLS já validou visibilidade no select acima; createSignedUrl não acrescenta
  // gating mas é a forma canónica de acesso ao bucket privado.
  const pdfResult = await getLessonPdfSignedUrlAction(lesson.id);
  const pdfUrl = pdfResult.ok ? pdfResult.url : null;

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

      <section aria-labelledby="apostila-heading" className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2
            id="apostila-heading"
            className="text-muted-foreground text-xs font-semibold tracking-wide uppercase"
          >
            Apostila
          </h2>
          <PdfDownloadButton lessonId={lesson.id} lessonTitle={lesson.title} />
        </div>
        {pdfUrl ? (
          <div className="border-border bg-card mt-3 h-[75vh] w-full overflow-hidden rounded-2xl border">
            <iframe
              src={pdfUrl}
              title={`Apostila: ${lesson.title}`}
              className="h-full w-full"
              // O bucket é privado; só este iframe (com URL assinada de 5 min) e o
              // botão de download conseguem ler. Em mobile, alguns browsers ignoram
              // o iframe e abrem o PDF na app nativa — comportamento aceitável.
            />
          </div>
        ) : (
          <p className="text-muted-foreground mt-3 inline-flex items-center rounded-md border border-dashed px-4 py-3 text-sm">
            Não foi possível carregar a apostila. Usa o botão “Descarregar apostila” para a obter.
          </p>
        )}
      </section>

      <div className="mt-8">
        <MarkCompleteButton lessonId={lesson.id} initiallyCompleted={completed.has(lesson.id)} />
      </div>

      {/* Mensagem de "módulo completo → próximo módulo" quando aplicável. */}
      {isLastInModule && moduleDone && nextModule && nextModule.lessons[0] && (
        <div className="border-orange-primary/30 bg-orange-primary/5 mt-10 rounded-2xl border p-6">
          <p className="text-orange-primary text-xs font-semibold tracking-wide uppercase">
            ✓ Módulo concluído
          </p>
          <p className="text-ink mt-2 text-base">
            Parabéns — terminaste todas as aulas de <strong>{currentModule?.title}</strong>. Avança
            para o próximo módulo: <strong>{nextModule.title}</strong>.
          </p>
          <Link
            href={`/conteudos/${course.slug}/${nextModule.lessons[0].id}`}
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring mt-4 inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Próximo módulo →
          </Link>
        </div>
      )}
      {isLastInModule && moduleDone && !nextModule && (
        <div className="border-orange-primary/30 bg-orange-primary/5 mt-10 rounded-2xl border p-6">
          <p className="text-orange-primary text-xs font-semibold tracking-wide uppercase">
            ✓ Curso concluído
          </p>
          <p className="text-ink mt-2 text-base">
            Concluíste todas as aulas deste curso. Bem feito.
          </p>
          <Link
            href={`/conteudos/${course.slug}`}
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring mt-4 inline-flex h-10 items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Voltar ao curso →
          </Link>
        </div>
      )}

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
    </article>
  );
}
