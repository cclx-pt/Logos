import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { SubmitButton } from '@/components/ui/submit-button';
import { ConteudosBreadcrumb } from '../../conteudos-breadcrumb';
import { CourseTree } from '../../course-tree';
import { createLessonAction, deleteLessonAction, updateLessonAction } from '../../lessons-actions';
import { deleteModuleAction, updateModuleAction } from '../../modules-actions';
import { LessonList, type LessonListItem } from '../../lesson-list';

export const metadata = {
  title: 'Módulo · Área admin · LOGOS',
};

type CourseRow = { id: string; title: string };
type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  course_id: string;
  position: number;
};
type SiblingModuleRow = { id: string; position: number };

type PageProps = {
  params: Promise<{ courseId: string; moduleId: string }>;
  searchParams: Promise<{ editar?: string; apagar?: string; confirmar?: string }>;
};

export default async function ModuloDetalhePage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const { courseId, moduleId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(moduleId)) {
    notFound();
  }

  const { editar, apagar, confirmar } = await searchParams;
  const isConfirmingModuleDelete = confirmar === 'apagar';

  const supabase = await getServerClient();
  const [
    { data: course, error: courseError },
    { data: module, error: moduleError },
    { data: siblingModules, error: siblingsError },
    { data: lessonsData, error: lessonsError },
  ] = await Promise.all([
    supabase.from('courses').select('id, title').eq('id', courseId).maybeSingle<CourseRow>(),
    supabase
      .from('modules')
      .select('id, title, description, course_id, position')
      .eq('id', moduleId)
      .maybeSingle<ModuleRow>(),
    supabase
      .from('modules')
      .select('id, position')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
      .returns<SiblingModuleRow[]>(),
    supabase
      .from('lessons')
      .select('id, title, description, template, youtube_url, position')
      .eq('module_id', moduleId)
      .order('position', { ascending: true })
      .returns<LessonListItem[]>(),
  ]);

  if (courseError) {
    throw new Error(`Falha a carregar curso: ${courseError.message}`);
  }
  if (moduleError) {
    throw new Error(`Falha a carregar módulo: ${moduleError.message}`);
  }
  if (siblingsError) {
    throw new Error(`Falha a carregar módulos do curso: ${siblingsError.message}`);
  }
  if (lessonsError) {
    throw new Error(`Falha a carregar aulas: ${lessonsError.message}`);
  }
  if (!course || !module || module.course_id !== course.id) {
    notFound();
  }

  const lessons = lessonsData ?? [];
  const siblings = siblingModules ?? [];
  const modulePosition = Math.max(1, siblings.findIndex((m) => m.id === module.id) + 1);
  const backHref = `/admin/conteudos/${course.id}/${module.id}`;
  const editingLesson = editar ? lessons.find((l) => l.id === editar) : undefined;
  const deletingLesson = apagar ? lessons.find((l) => l.id === apagar) : undefined;

  const lessonEditingNode = editingLesson ? (
    <form
      action={async (formData: FormData) => {
        'use server';
        const result = await updateLessonAction(formData);
        redirect(result.ok ? `${backHref}?guardado=aula_atualizada` : `${backHref}?erro=generico`);
      }}
      encType="multipart/form-data"
      className="space-y-4"
    >
      <input type="hidden" name="id" value={editingLesson.id} />
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
          defaultValue={editingLesson.title}
          className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-muted-foreground text-xs font-medium">Descrição (opcional)</span>
        <textarea
          name="description"
          rows={2}
          maxLength={4000}
          defaultValue={editingLesson.description ?? ''}
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
              defaultChecked={editingLesson.template === 'pdf'}
              className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            />
            <span>Só PDF</span>
          </label>
          <label className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors">
            <input
              type="radio"
              name="template"
              value="video_pdf"
              defaultChecked={editingLesson.template === 'video_pdf'}
              className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
            />
            <span>Vídeo + PDF</span>
          </label>
        </div>
      </fieldset>

      <label className="block">
        <span className="text-muted-foreground text-xs font-medium">
          URL do YouTube{' '}
          <span className="text-muted-foreground/70 font-normal">(obrigatório se Vídeo + PDF)</span>
        </span>
        <input
          type="url"
          name="youtube_url"
          defaultValue={editingLesson.youtube_url ?? ''}
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

      <div className="flex flex-wrap items-start gap-2">
        <SubmitButton pendingLabel="A guardar…" showProgressBar className="h-9 px-3 text-xs">
          Guardar
        </SubmitButton>
        <Link
          href={backHref}
          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Cancelar
        </Link>
      </div>
    </form>
  ) : null;

  const lessonDeletingNode = deletingLesson ? (
    <div className="border-l-destructive bg-destructive/10 border-l-4 p-4">
      <p className="text-ink text-sm">
        Apagar a aula <strong>{deletingLesson.title}</strong>? Esta ação remove também o PDF e todas
        as conclusões associadas. Não pode ser revertida.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <form
          action={async (formData: FormData) => {
            'use server';
            const result = await deleteLessonAction(formData);
            redirect(result.ok ? `${backHref}?guardado=aula_apagada` : `${backHref}?erro=generico`);
          }}
        >
          <input type="hidden" name="id" value={deletingLesson.id} />
          <input type="hidden" name="course_id" value={course.id} />
          <input type="hidden" name="module_id" value={module.id} />
          <SubmitButton
            pendingLabel="A apagar…"
            className="bg-destructive hover:bg-destructive/90 h-9 px-3 text-xs"
          >
            Apagar definitivamente
          </SubmitButton>
        </form>
        <Link
          href={backHref}
          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Cancelar
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-6">
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
            <span className="text-muted-foreground tabular-nums">{modulePosition}.</span>{' '}
            {module.title}
          </h1>
        </header>

        {editingLesson ? (
          <CollapsibleSection
            id="detalhes-aula"
            title="Detalhes da aula"
            subtitle={editingLesson.title}
            defaultOpen
          >
            {lessonEditingNode}
          </CollapsibleSection>
        ) : (
          <>
            <CollapsibleSection
              id="detalhes-modulo"
              title="Detalhes do módulo"
              subtitle="Título e descrição visíveis na árvore do curso e no breadcrumb."
            >
              <form
                action={async (formData: FormData) => {
                  'use server';
                  const result = await updateModuleAction(formData);
                  redirect(
                    result.ok
                      ? `${backHref}?guardado=modulo_atualizado`
                      : `${backHref}?erro=generico`,
                  );
                }}
                className="space-y-3"
              >
                <input type="hidden" name="id" value={module.id} />
                <input type="hidden" name="course_id" value={course.id} />
                <label className="block">
                  <span className="text-muted-foreground text-xs font-medium">Título</span>
                  <input
                    type="text"
                    name="title"
                    required
                    minLength={1}
                    maxLength={120}
                    defaultValue={module.title}
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
                    defaultValue={module.description ?? ''}
                    className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="A guardar…">Guardar</SubmitButton>
                </div>
              </form>
            </CollapsibleSection>

            <CollapsibleSection
              id="aulas"
              title={`Aulas (${lessons.length})`}
              subtitle={
                <>
                  Cada aula tem obrigatoriamente uma apostila (PDF). O vídeo do YouTube é opcional —
                  escolhe o template <strong>Vídeo + PDF</strong> se a aula tiver ambos.
                </>
              }
            >
              <div className="space-y-4">
                <div className="border-border bg-background rounded-lg border p-5">
                  <h3 className="text-ink text-sm font-semibold tracking-wide uppercase">
                    Nova aula
                  </h3>
                  <form
                    action={async (formData: FormData) => {
                      'use server';
                      const result = await createLessonAction(formData);
                      redirect(
                        result.ok
                          ? `${backHref}?guardado=aula_criada`
                          : `${backHref}?erro=generico`,
                      );
                    }}
                    encType="multipart/form-data"
                    className="mt-4 space-y-4"
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
                      <legend className="text-muted-foreground px-1 text-xs font-medium">
                        Template
                      </legend>
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
                      <SubmitButton pendingLabel="A enviar PDF…" showProgressBar>
                        Adicionar aula
                      </SubmitButton>
                    </div>
                  </form>
                </div>

                <LessonList
                  initial={lessons}
                  courseId={course.id}
                  moduleId={module.id}
                  modulePosition={modulePosition}
                  deletingId={apagar}
                  deletingNode={lessonDeletingNode}
                />
              </div>
            </CollapsibleSection>

            <CollapsibleSection id="zona-perigo-modulo" title="Zona de perigo" variant="danger">
              {isConfirmingModuleDelete ? (
                <div className="space-y-3">
                  <p className="text-ink text-sm">
                    Apagar definitivamente o módulo <strong>{module.title}</strong>? Esta ação
                    remove também todas as aulas e conclusões associadas. Não pode ser revertida.
                  </p>
                  <div className="flex flex-wrap items-start gap-2">
                    <form
                      action={async (formData: FormData) => {
                        'use server';
                        const result = await deleteModuleAction(formData);
                        if (result.ok) {
                          redirect(`/admin/conteudos/${course.id}?guardado=modulo_apagado`);
                        }
                        redirect(`${backHref}?erro=generico`);
                      }}
                    >
                      <input type="hidden" name="id" value={module.id} />
                      <input type="hidden" name="course_id" value={course.id} />
                      <SubmitButton
                        pendingLabel="A apagar…"
                        className="bg-destructive hover:bg-destructive/90 h-9 px-3 text-xs"
                      >
                        Apagar definitivamente
                      </SubmitButton>
                    </form>
                    <Link
                      href={backHref}
                      className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                    >
                      Cancelar
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-muted-foreground max-w-prose text-sm">
                    Apagar um módulo é irreversível. Remove também as aulas, PDFs e conclusões
                    associadas.
                  </p>
                  <Link
                    href={`${backHref}?confirmar=apagar`}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Apagar módulo…
                  </Link>
                </div>
              )}
            </CollapsibleSection>
          </>
        )}
      </div>

      <CourseTree
        courseId={course.id}
        courseTitle={course.title}
        currentModuleId={module.id}
        currentLessonId={editar}
      />
    </div>
  );
}
