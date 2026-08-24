import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { SubmitButton } from '@/components/ui/submit-button';
import { CollapsibleSection } from '@/components/ui/collapsible-section';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';
import { getBannerUrlForPath } from '@/lib/courses/banner';
import { CourseForm, type CourseOption, type TagOption } from '../course-form';
import { ConteudosBreadcrumb } from '../conteudos-breadcrumb';
import { CourseStatsContent } from '../course-stats-content';
import { CourseTree } from '../course-tree';
import { deleteCourseAction, updateCourseAction } from '../courses-actions';
import { createModuleAction, deleteModuleAction, updateModuleAction } from '../modules-actions';
import { ModuleList, type ModuleListItem } from '../module-list';

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  required_tags: string[];
  published_at: string | null;
  banner_storage_path: string | null;
  sequential_lessons: boolean;
  sequential_modules: boolean;
  prerequisite_course_id: string | null;
};

export const metadata = {
  title: 'Curso · Área admin · LOGOS',
};

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ confirmar?: string; editar?: string; apagar?: string }>;
};

export default async function CursoDetalhePage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const { courseId } = await params;
  if (!UUID_RE.test(courseId)) {
    notFound();
  }

  const { confirmar, editar, apagar } = await searchParams;
  const isConfirmingCourseDelete = confirmar === 'apagar';

  const supabase = await getServerClient();
  const [
    { data: course, error: courseError },
    { data: tagsData, error: tagsError },
    { data: modulesData, error: modulesError },
    { data: allCourses, error: allCoursesError },
  ] = await Promise.all([
    supabase
      .from('courses')
      .select(
        'id, title, description, icon, required_tags, published_at, banner_storage_path, sequential_lessons, sequential_modules, prerequisite_course_id',
      )
      .eq('id', courseId)
      .maybeSingle<CourseRow>(),
    supabase
      .from('tags')
      .select('id, label')
      .order('label', { ascending: true })
      .returns<TagOption[]>(),
    supabase
      .from('modules')
      .select('id, title, description, position')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
      .returns<ModuleListItem[]>(),
    supabase
      .from('courses')
      .select('id, title')
      .order('title', { ascending: true })
      .returns<CourseOption[]>(),
  ]);

  if (courseError) {
    throw new Error(`Falha a carregar curso: ${courseError.message}`);
  }
  if (!course) {
    notFound();
  }
  if (tagsError) {
    throw new Error(`Falha a carregar etiquetas: ${tagsError.message}`);
  }
  if (modulesError) {
    throw new Error(`Falha a carregar módulos: ${modulesError.message}`);
  }
  if (allCoursesError) {
    throw new Error(`Falha a carregar cursos: ${allCoursesError.message}`);
  }

  // Exclui o próprio curso das opções de pré-requisito (evita auto-referência
  // na UI; a action também a recusa).
  const courseOptions = (allCourses ?? []).filter((c) => c.id !== course.id);

  const modules = modulesData ?? [];
  const editingModule = editar ? modules.find((m) => m.id === editar) : undefined;
  const deletingModule = apagar ? modules.find((m) => m.id === apagar) : undefined;

  const bannerUrl = await getBannerUrlForPath(course.banner_storage_path);
  const courseFormData = {
    id: course.id,
    title: course.title,
    description: course.description,
    icon: course.icon,
    required_tags: course.required_tags,
    published_at: course.published_at,
    bannerUrl,
    sequential_lessons: course.sequential_lessons,
    sequential_modules: course.sequential_modules,
    prerequisite_course_id: course.prerequisite_course_id,
  };

  const editingNode = editingModule ? (
    <div className="bg-muted/20 p-4">
      <form
        action={async (formData: FormData) => {
          'use server';
          const result = await updateModuleAction(formData);
          redirect(
            result.ok
              ? `/admin/conteudos/${course.id}?guardado=modulo_atualizado`
              : `/admin/conteudos/${course.id}?erro=generico`,
          );
        }}
        className="space-y-3"
      >
        <input type="hidden" name="id" value={editingModule.id} />
        <input type="hidden" name="course_id" value={course.id} />
        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">Título</span>
          <input
            type="text"
            name="title"
            required
            minLength={1}
            maxLength={120}
            defaultValue={editingModule.title}
            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">Descrição (opcional)</span>
          <textarea
            name="description"
            rows={2}
            maxLength={4000}
            defaultValue={editingModule.description ?? ''}
            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
        <div className="flex flex-wrap items-start gap-2">
          <SubmitButton pendingLabel="A guardar…" className="h-9 px-3 text-xs">
            Guardar
          </SubmitButton>
          <Link
            href={`/admin/conteudos/${course.id}`}
            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  ) : null;

  const deletingNode = deletingModule ? (
    <div className="border-l-destructive bg-destructive/10 border-l-4 p-4">
      <p className="text-ink text-sm">
        Apagar o módulo <strong>{deletingModule.title}</strong>? Esta ação remove também todas as
        aulas e conclusões associadas. Não pode ser revertida.
      </p>
      <div className="mt-3 flex flex-wrap items-start gap-2">
        <form
          action={async (formData: FormData) => {
            'use server';
            const result = await deleteModuleAction(formData);
            redirect(
              result.ok
                ? `/admin/conteudos/${course.id}?guardado=modulo_apagado`
                : `/admin/conteudos/${course.id}?erro=generico`,
            );
          }}
        >
          <input type="hidden" name="id" value={deletingModule.id} />
          <input type="hidden" name="course_id" value={course.id} />
          <SubmitButton
            pendingLabel="A apagar…"
            className="bg-destructive hover:bg-destructive/90 h-9 px-3 text-xs"
          >
            Apagar definitivamente
          </SubmitButton>
        </form>
        <Link
          href={`/admin/conteudos/${course.id}`}
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
        <ConteudosBreadcrumb courseTitle={course.title} />

        <header>
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
            {course.title}
          </h1>
        </header>

        <CollapsibleSection
          id="detalhes"
          title="Detalhes do curso"
          subtitle="Metadados visíveis no catálogo público. Despublicar não apaga - apenas esconde dos utilizadores."
        >
          <CourseForm
            mode="edit"
            tags={tagsData ?? []}
            courseOptions={courseOptions}
            course={courseFormData}
            submitAction={updateCourseAction}
          />
        </CollapsibleSection>

        <CollapsibleSection
          id="modulos"
          title={`Módulos (${modules.length})`}
          subtitle={
            <>
              Cada módulo agrupa um conjunto de aulas. Usa as setas para reordenar e o botão{' '}
              <strong>Aulas</strong> para gerir as aulas de cada módulo.
            </>
          }
        >
          <div className="space-y-4">
            <div className="border-border bg-background rounded-lg border p-5">
              <h3 className="text-ink text-sm font-semibold tracking-wide uppercase">
                Novo módulo
              </h3>
              <form
                action={async (formData: FormData) => {
                  'use server';
                  const result = await createModuleAction(formData);
                  redirect(
                    result.ok
                      ? `/admin/conteudos/${course.id}?guardado=modulo_criado`
                      : `/admin/conteudos/${course.id}?erro=generico`,
                  );
                }}
                className="mt-4 space-y-3"
              >
                <input type="hidden" name="course_id" value={course.id} />
                <label className="block">
                  <span className="text-muted-foreground text-xs font-medium">Título</span>
                  <input
                    type="text"
                    name="title"
                    required
                    minLength={1}
                    maxLength={120}
                    placeholder="Ex.: Introdução ao Evangelho de Marcos"
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
                    placeholder="Frase curta a explicar o que o módulo cobre."
                    className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                  />
                </label>
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="A criar…">Adicionar módulo</SubmitButton>
                </div>
              </form>
            </div>

            <ModuleList
              initial={modules}
              courseId={course.id}
              editingId={editar}
              editingNode={editingNode}
              deletingId={apagar}
              deletingNode={deletingNode}
            />
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          id="estatisticas"
          title="Estatísticas"
          subtitle="Telemetria de acessos e conclusões. Só admin/super_admin vê."
        >
          <CourseStatsContent courseId={course.id} />
        </CollapsibleSection>

        <CollapsibleSection id="zona-perigo" title="Zona de perigo" variant="danger">
          {isConfirmingCourseDelete ? (
            <div className="space-y-3">
              <p className="text-ink text-sm">
                Apagar definitivamente o curso <strong>{course.title}</strong>? Esta ação remove
                também todos os módulos, aulas e conclusões associadas. Não pode ser revertida.
              </p>
              <div className="flex flex-wrap items-start gap-2">
                <form
                  action={async (formData: FormData) => {
                    'use server';
                    const result = await deleteCourseAction(formData);
                    if (result.ok) {
                      redirect('/admin/conteudos?guardado=curso_apagado');
                    }
                  }}
                >
                  <input type="hidden" name="id" value={course.id} />
                  <SubmitButton
                    pendingLabel="A apagar…"
                    className="bg-destructive hover:bg-destructive/90 h-9 px-3 text-xs"
                  >
                    Apagar definitivamente
                  </SubmitButton>
                </form>
                <Link
                  href={`/admin/conteudos/${course.id}`}
                  className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                >
                  Cancelar
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-muted-foreground max-w-prose text-sm">
                Apagar um curso é irreversível. Considera marcá-lo como rascunho (desligar{' '}
                <strong>Publicado</strong>) em vez de apagar.
              </p>
              <Link
                href={`/admin/conteudos/${course.id}?confirmar=apagar`}
                className="text-destructive border-destructive/30 hover:bg-destructive/10 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Apagar curso…
              </Link>
            </div>
          )}
        </CollapsibleSection>
      </div>

      <CourseTree courseId={course.id} courseTitle={course.title} />
    </div>
  );
}
