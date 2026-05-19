import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { CoursesColumn, ConteudosBreadcrumb } from '../../courses-column';
import {
  createLessonAction,
  deleteLessonAction,
  moveLessonDownAction,
  moveLessonUpAction,
  updateLessonAction,
} from '../../lessons-actions';

export const metadata = {
  title: 'Aulas · Área admin · LOGOS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CourseRow = { id: string; title: string };
type ModuleRow = { id: string; title: string; course_id: string };
type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  template: 'pdf' | 'video_pdf';
  youtube_url: string | null;
  pdf_storage_path: string;
  position: number;
};

type PageProps = {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ editar?: string; apagar?: string }>;
};

export default async function ModuloAulasPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    notFound();
  }

  const { courseId, moduleId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(moduleId)) {
    notFound();
  }

  const { editar, apagar } = await searchParams;

  const supabase = await getServerClient();
  const [
    { data: course, error: courseError },
    { data: module, error: moduleError },
    { data: lessonsData, error: lessonsError },
  ] = await Promise.all([
    supabase.from('courses').select('id, title').eq('id', courseId).maybeSingle<CourseRow>(),
    supabase
      .from('modules')
      .select('id, title, course_id')
      .eq('id', moduleId)
      .maybeSingle<ModuleRow>(),
    supabase
      .from('lessons')
      .select('id, title, description, template, youtube_url, pdf_storage_path, position')
      .eq('module_id', moduleId)
      .order('position', { ascending: true })
      .returns<LessonRow[]>(),
  ]);

  if (courseError) {
    throw new Error(`Falha a carregar curso: ${courseError.message}`);
  }
  if (moduleError) {
    throw new Error(`Falha a carregar módulo: ${moduleError.message}`);
  }
  if (lessonsError) {
    throw new Error(`Falha a carregar aulas: ${lessonsError.message}`);
  }
  if (!course || !module || module.course_id !== course.id) {
    notFound();
  }

  const lessons = lessonsData ?? [];

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-10">
        <ConteudosBreadcrumb
          courseTitle={course.title}
          courseId={course.id}
          moduleTitle={module.title}
        />

        <header>
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            <Link
              href={`/admin/conteudos/${course.id}`}
              className="hover:text-ink transition-colors"
            >
              ← {course.title}
            </Link>
          </p>
          <h1 className="font-display text-ink mt-2 text-3xl font-medium tracking-tight">
            {module.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Gere as aulas deste módulo. Cada aula tem obrigatoriamente uma apostila (PDF). O vídeo
            do YouTube é opcional — escolhe o template <strong>Vídeo + PDF</strong> se a aula tiver
            ambos.
          </p>
        </header>

        <section aria-labelledby="nova-aula-heading" className="space-y-4">
          <header>
            <h2
              id="nova-aula-heading"
              className="font-display text-ink text-2xl font-medium tracking-tight"
            >
              Nova aula
            </h2>
          </header>

          <form
            action={async (formData: FormData) => {
              'use server';
              await createLessonAction(formData);
            }}
            encType="multipart/form-data"
            className="border-border bg-card space-y-4 rounded-lg border p-5"
          >
            <input type="hidden" name="course_id" value={course.id} />
            <input type="hidden" name="module_id" value={module.id} />

            <label className="block">
              <span className="text-muted-foreground text-xs font-medium">Título</span>
              <input
                type="text"
                name="title"
                required
                minLength={1}
                maxLength={120}
                placeholder="Ex.: A entrada de Jesus em Jerusalém"
                className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-muted-foreground text-xs font-medium">
                Descrição (opcional)
              </span>
              <textarea
                name="description"
                rows={2}
                maxLength={4000}
                placeholder="Frase curta a explicar o foco da aula."
                className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>

            <fieldset className="border-border rounded-md border p-4">
              <legend className="text-muted-foreground px-1 text-xs font-medium">Template</legend>
              <div className="flex flex-wrap gap-3">
                <label className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
                  <input
                    type="radio"
                    name="template"
                    value="pdf"
                    defaultChecked
                    className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                  />
                  <span>Só PDF</span>
                </label>
                <label className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
                  <input
                    type="radio"
                    name="template"
                    value="video_pdf"
                    className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                  />
                  <span>Vídeo + PDF</span>
                </label>
              </div>
            </fieldset>

            <label className="block">
              <span className="text-muted-foreground text-xs font-medium">
                URL do YouTube{' '}
                <span className="text-muted-foreground/70 font-normal">
                  (obrigatório se template = Vídeo + PDF)
                </span>
              </span>
              <input
                type="url"
                name="youtube_url"
                placeholder="https://youtu.be/… ou https://www.youtube.com/watch?v=…"
                className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>

            <label className="block">
              <span className="text-muted-foreground text-xs font-medium">
                Apostila PDF (até 20 MB)
              </span>
              <input
                type="file"
                name="pdf"
                accept="application/pdf"
                required
                className="border-border bg-background text-ink file:bg-muted file:text-ink hover:file:bg-muted/80 focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium focus-visible:ring-2 focus-visible:outline-none"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Adicionar aula
              </button>
            </div>
          </form>
        </section>

        <section aria-labelledby="lista-aulas-heading" className="space-y-4">
          <header>
            <h2
              id="lista-aulas-heading"
              className="font-display text-ink text-2xl font-medium tracking-tight"
            >
              Aulas existentes ({lessons.length})
            </h2>
          </header>

          {lessons.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Ainda não há aulas neste módulo. Adiciona a primeira no formulário acima.
            </p>
          ) : (
            <ol className="border-border divide-border space-y-0 divide-y overflow-hidden rounded-lg border">
              {lessons.map((lesson, index) => {
                const isEditing = editar === lesson.id;
                const isConfirmingDelete = apagar === lesson.id;
                const isFirst = index === 0;
                const isLast = index === lessons.length - 1;
                const lessonNumber = index + 1;
                const backHref = `/admin/conteudos/${course.id}/${module.id}`;

                if (isEditing) {
                  return (
                    <li key={lesson.id} className="bg-muted/20 p-4">
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          await updateLessonAction(formData);
                          redirect(backHref);
                        }}
                        encType="multipart/form-data"
                        className="space-y-3"
                      >
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="course_id" value={course.id} />
                        <input type="hidden" name="module_id" value={module.id} />

                        <label className="block">
                          <span className="text-muted-foreground text-xs font-medium">Título</span>
                          <input
                            type="text"
                            name="title"
                            required
                            minLength={1}
                            maxLength={120}
                            defaultValue={lesson.title}
                            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-muted-foreground text-xs font-medium">
                            Descrição (opcional)
                          </span>
                          <textarea
                            name="description"
                            rows={2}
                            maxLength={4000}
                            defaultValue={lesson.description ?? ''}
                            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                          />
                        </label>

                        <fieldset className="border-border rounded-md border p-3">
                          <legend className="text-muted-foreground px-1 text-xs font-medium">
                            Template
                          </legend>
                          <div className="flex flex-wrap gap-3">
                            <label className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
                              <input
                                type="radio"
                                name="template"
                                value="pdf"
                                defaultChecked={lesson.template === 'pdf'}
                                className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                              />
                              <span>Só PDF</span>
                            </label>
                            <label className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
                              <input
                                type="radio"
                                name="template"
                                value="video_pdf"
                                defaultChecked={lesson.template === 'video_pdf'}
                                className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
                              />
                              <span>Vídeo + PDF</span>
                            </label>
                          </div>
                        </fieldset>

                        <label className="block">
                          <span className="text-muted-foreground text-xs font-medium">
                            URL do YouTube{' '}
                            <span className="text-muted-foreground/70 font-normal">
                              (obrigatório se Vídeo + PDF)
                            </span>
                          </span>
                          <input
                            type="url"
                            name="youtube_url"
                            defaultValue={lesson.youtube_url ?? ''}
                            placeholder="https://youtu.be/… ou https://www.youtube.com/watch?v=…"
                            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                          />
                        </label>

                        <label className="block">
                          <span className="text-muted-foreground text-xs font-medium">
                            Substituir apostila (opcional, até 20 MB)
                          </span>
                          <input
                            type="file"
                            name="pdf"
                            accept="application/pdf"
                            className="border-border bg-background text-ink file:bg-muted file:text-ink hover:file:bg-muted/80 focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium focus-visible:ring-2 focus-visible:outline-none"
                          />
                          <span className="text-muted-foreground mt-1 block text-[11px]">
                            Deixar vazio mantém a apostila actual.
                          </span>
                        </label>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="submit"
                            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Guardar
                          </button>
                          <Link
                            href={backHref}
                            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Cancelar
                          </Link>
                        </div>
                      </form>
                    </li>
                  );
                }

                if (isConfirmingDelete) {
                  return (
                    <li
                      key={lesson.id}
                      className="border-l-destructive bg-destructive/10 border-l-4 p-4"
                    >
                      <p className="text-ink text-sm">
                        Apagar a aula <strong>{lesson.title}</strong>? Esta ação remove também o PDF
                        e todas as conclusões associadas. Não pode ser revertida.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            await deleteLessonAction(formData);
                            redirect(backHref);
                          }}
                        >
                          <input type="hidden" name="id" value={lesson.id} />
                          <input type="hidden" name="course_id" value={course.id} />
                          <input type="hidden" name="module_id" value={module.id} />
                          <button
                            type="submit"
                            className="bg-destructive hover:bg-destructive/90 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Apagar definitivamente
                          </button>
                        </form>
                        <Link
                          href={backHref}
                          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Cancelar
                        </Link>
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={lesson.id} className="flex flex-wrap items-start gap-4 p-4">
                    <div className="text-muted-foreground min-w-[2rem] text-sm font-medium tabular-nums">
                      {lessonNumber}.
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-ink font-medium">{lesson.title}</p>
                      <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span className="border-border bg-muted/40 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                          {lesson.template === 'video_pdf' ? 'vídeo + pdf' : 'só pdf'}
                        </span>
                        {lesson.template === 'video_pdf' && lesson.youtube_url ? (
                          <a
                            href={lesson.youtube_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-ink line-clamp-1 break-all underline-offset-2 hover:underline"
                          >
                            {lesson.youtube_url}
                          </a>
                        ) : null}
                      </div>
                      {lesson.description ? (
                        <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                          {lesson.description}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          await moveLessonUpAction(formData);
                        }}
                      >
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="course_id" value={course.id} />
                        <input type="hidden" name="module_id" value={module.id} />
                        <button
                          type="submit"
                          disabled={isFirst}
                          aria-label={`Mover ${lesson.title} para cima`}
                          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ↑
                        </button>
                      </form>
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          await moveLessonDownAction(formData);
                        }}
                      >
                        <input type="hidden" name="id" value={lesson.id} />
                        <input type="hidden" name="course_id" value={course.id} />
                        <input type="hidden" name="module_id" value={module.id} />
                        <button
                          type="submit"
                          disabled={isLast}
                          aria-label={`Mover ${lesson.title} para baixo`}
                          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          ↓
                        </button>
                      </form>
                      <Link
                        href={`${backHref}?editar=${lesson.id}`}
                        className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`${backHref}?apagar=${lesson.id}`}
                        className="text-destructive focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Apagar
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <CoursesColumn selectedId={course.id} />
    </div>
  );
}
