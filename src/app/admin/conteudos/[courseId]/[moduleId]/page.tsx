import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { SubmitButton } from '@/components/ui/submit-button';
import { ConteudosBreadcrumb } from '../../conteudos-breadcrumb';
import { CourseTree } from '../../course-tree';
import {
  createLessonAction,
  deleteLessonAction,
  updateLessonAction,
} from '../../lessons-actions';
import { LessonList, type LessonListItem } from '../../lesson-list';

export const metadata = {
  title: 'Aulas · Área admin · LOGOS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type CourseRow = { id: string; title: string };
type ModuleRow = { id: string; title: string; course_id: string };

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
  if (lessonsError) {
    throw new Error(`Falha a carregar aulas: ${lessonsError.message}`);
  }
  if (!course || !module || module.course_id !== course.id) {
    notFound();
  }

  const lessons = lessonsData ?? [];
  const backHref = `/admin/conteudos/${course.id}/${module.id}`;
  const editingLesson = editar ? lessons.find((l) => l.id === editar) : undefined;
  const deletingLesson = apagar ? lessons.find((l) => l.id === apagar) : undefined;

  const editingNode = editingLesson ? (
    <div className="bg-muted/20 p-4">
      <form
        action={async (formData: FormData) => {
          'use server';
          await updateLessonAction(formData);
          redirect(backHref);
        }}
        encType="multipart/form-data"
        className="space-y-3"
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

        <fieldset className="border-border rounded-md border p-3">
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
            <span className="text-muted-foreground/70 font-normal">
              (obrigatório se Vídeo + PDF)
            </span>
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
    </div>
  ) : null;

  const deletingNode = deletingLesson ? (
    <div className="border-l-destructive bg-destructive/10 border-l-4 p-4">
      <p className="text-ink text-sm">
        Apagar a aula <strong>{deletingLesson.title}</strong>? Esta ação remove também o PDF e
        todas as conclusões associadas. Não pode ser revertida.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <form
          action={async (formData: FormData) => {
            'use server';
            await deleteLessonAction(formData);
            redirect(backHref);
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
            <Link href={`/admin/conteudos/${course.id}`} className="hover:text-ink transition-colors">
              ← {course.title}
            </Link>
          </p>
          <h1 className="font-display text-ink mt-2 text-3xl font-medium tracking-tight">
            {module.title}
          </h1>
        </header>

        <CollapsibleSection
          id="nova-aula"
          title="Nova aula"
          subtitle={
            <>
              Cada aula tem obrigatoriamente uma apostila (PDF). O vídeo do YouTube é opcional —
              escolhe o template <strong>Vídeo + PDF</strong> se a aula tiver ambos.
            </>
          }
        >
          <form
            action={async (formData: FormData) => {
              'use server';
              await createLessonAction(formData);
            }}
            encType="multipart/form-data"
            className="space-y-4"
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
              <SubmitButton pendingLabel="A enviar PDF…" showProgressBar>
                Adicionar aula
              </SubmitButton>
            </div>
          </form>
        </CollapsibleSection>

        <CollapsibleSection
          id="lista-aulas"
          title={`Aulas existentes (${lessons.length})`}
        >
          <LessonList
            initial={lessons}
            courseId={course.id}
            moduleId={module.id}
            editingId={editar}
            editingNode={editingNode}
            deletingId={apagar}
            deletingNode={deletingNode}
          />
        </CollapsibleSection>
      </div>

      <CourseTree courseId={course.id} currentModuleId={module.id} currentLessonId={editar} />
    </div>
  );
}
