import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { CourseForm, type CourseFormInitialData, type TagOption } from '../course-form';
import { CoursesColumn, ConteudosBreadcrumb } from '../courses-column';
import { deleteCourseAction, updateCourseAction } from '../courses-actions';
import {
  createModuleAction,
  deleteModuleAction,
  moveModuleDownAction,
  moveModuleUpAction,
  updateModuleAction,
} from '../modules-actions';

export const metadata = {
  title: 'Curso · Área admin · LOGOS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ModuleRow = {
  id: string;
  title: string;
  description: string | null;
  position: number;
};

type PageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ confirmar?: string; editar?: string; apagar?: string }>;
};

export default async function CursoDetalhePage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
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
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id, slug, title, description, icon, required_tags, published_at')
      .eq('id', courseId)
      .maybeSingle<CourseFormInitialData>(),
    supabase
      .from('tags')
      .select('id, slug, label')
      .order('label', { ascending: true })
      .returns<TagOption[]>(),
    supabase
      .from('modules')
      .select('id, title, description, position')
      .eq('course_id', courseId)
      .order('position', { ascending: true })
      .returns<ModuleRow[]>(),
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

  const modules = modulesData ?? [];

  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-10">
        <ConteudosBreadcrumb courseTitle={course.title} />

        <header>
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
            {course.title}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Gere os módulos do curso aqui. Os detalhes do curso (título, slug, etiquetas) podem ser
            editados mais abaixo.
          </p>
        </header>

        <section aria-labelledby="modulos-heading" className="space-y-4">
          <header>
            <h2
              id="modulos-heading"
              className="font-display text-ink text-2xl font-medium tracking-tight"
            >
              Módulos
            </h2>
            <p className="text-muted-foreground mt-1 max-w-prose text-sm">
              Cada módulo agrupa um conjunto de aulas. Usa as setas para reordenar e o botão{' '}
              <strong>Aulas</strong> para gerir as aulas de cada módulo.
            </p>
          </header>

          <div className="border-border bg-card rounded-lg border p-5">
            <h3 className="text-ink text-sm font-semibold tracking-wide uppercase">Novo módulo</h3>
            <form
              action={async (formData: FormData) => {
                'use server';
                await createModuleAction(formData);
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
                <button
                  type="submit"
                  className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  Adicionar módulo
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="text-ink text-sm font-semibold tracking-wide uppercase">
              Módulos existentes ({modules.length})
            </h3>
            {modules.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                Ainda não há módulos. Adiciona o primeiro no formulário acima.
              </p>
            ) : (
              <ol className="border-border divide-border space-y-0 divide-y overflow-hidden rounded-lg border">
                {modules.map((module, index) => {
                  const isEditing = editar === module.id;
                  const isConfirmingModuleDelete = apagar === module.id;
                  const isFirst = index === 0;
                  const isLast = index === modules.length - 1;
                  const moduleNumber = index + 1;

                  if (isEditing) {
                    return (
                      <li key={module.id} className="bg-muted/20 p-4">
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            await updateModuleAction(formData);
                            redirect(`/admin/conteudos/${course.id}`);
                          }}
                          className="space-y-3"
                        >
                          <input type="hidden" name="id" value={module.id} />
                          <input type="hidden" name="course_id" value={course.id} />
                          <label className="block">
                            <span className="text-muted-foreground text-xs font-medium">
                              Título
                            </span>
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
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="submit"
                              className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Guardar
                            </button>
                            <Link
                              href={`/admin/conteudos/${course.id}`}
                              className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Cancelar
                            </Link>
                          </div>
                        </form>
                      </li>
                    );
                  }

                  if (isConfirmingModuleDelete) {
                    return (
                      <li
                        key={module.id}
                        className="border-l-destructive bg-destructive/10 border-l-4 p-4"
                      >
                        <p className="text-ink text-sm">
                          Apagar o módulo <strong>{module.title}</strong>? Esta ação remove também
                          todas as aulas e conclusões associadas. Não pode ser revertida.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <form
                            action={async (formData: FormData) => {
                              'use server';
                              await deleteModuleAction(formData);
                              redirect(`/admin/conteudos/${course.id}`);
                            }}
                          >
                            <input type="hidden" name="id" value={module.id} />
                            <input type="hidden" name="course_id" value={course.id} />
                            <button
                              type="submit"
                              className="bg-destructive hover:bg-destructive/90 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Apagar definitivamente
                            </button>
                          </form>
                          <Link
                            href={`/admin/conteudos/${course.id}`}
                            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Cancelar
                          </Link>
                        </div>
                      </li>
                    );
                  }

                  return (
                    <li key={module.id} className="flex flex-wrap items-start gap-4 p-4">
                      <div className="text-muted-foreground min-w-[2rem] text-sm font-medium tabular-nums">
                        {moduleNumber}.
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-ink font-medium">{module.title}</p>
                        {module.description ? (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {module.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-1">
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            await moveModuleUpAction(formData);
                          }}
                        >
                          <input type="hidden" name="id" value={module.id} />
                          <input type="hidden" name="course_id" value={course.id} />
                          <button
                            type="submit"
                            disabled={isFirst}
                            aria-label={`Mover ${module.title} para cima`}
                            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↑
                          </button>
                        </form>
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            await moveModuleDownAction(formData);
                          }}
                        >
                          <input type="hidden" name="id" value={module.id} />
                          <input type="hidden" name="course_id" value={course.id} />
                          <button
                            type="submit"
                            disabled={isLast}
                            aria-label={`Mover ${module.title} para baixo`}
                            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            ↓
                          </button>
                        </form>
                        <Link
                          href={`/admin/conteudos/${course.id}/${module.id}`}
                          className="border-orange-primary/30 text-orange-primary hover:bg-orange-primary/10 focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Aulas →
                        </Link>
                        <Link
                          href={`/admin/conteudos/${course.id}?editar=${module.id}`}
                          className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Editar
                        </Link>
                        <Link
                          href={`/admin/conteudos/${course.id}?apagar=${module.id}`}
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
          </div>
        </section>

        <section aria-labelledby="detalhes-heading" className="space-y-4">
          <header>
            <h2
              id="detalhes-heading"
              className="font-display text-ink text-2xl font-medium tracking-tight"
            >
              Detalhes do curso
            </h2>
            <p className="text-muted-foreground mt-1 max-w-prose text-sm">
              Metadados visíveis no catálogo público. Despublicar não apaga — apenas esconde dos
              utilizadores.
            </p>
          </header>

          <CourseForm
            mode="edit"
            tags={tagsData ?? []}
            course={course}
            action={async (formData: FormData) => {
              'use server';
              await updateCourseAction(formData);
            }}
          />
        </section>

        <section
          aria-labelledby="zona-perigo-heading"
          className="border-destructive bg-destructive/10 rounded-lg border-2 p-5"
        >
          <h2
            id="zona-perigo-heading"
            className="text-destructive text-sm font-semibold tracking-wide uppercase"
          >
            Zona de perigo
          </h2>
          {isConfirmingCourseDelete ? (
            <div className="mt-3 space-y-3">
              <p className="text-ink text-sm">
                Apagar definitivamente o curso <strong>{course.title}</strong>? Esta ação remove
                também todos os módulos, aulas e conclusões associadas. Não pode ser revertida.
              </p>
              <div className="flex flex-wrap gap-2">
                <form
                  action={async (formData: FormData) => {
                    'use server';
                    const result = await deleteCourseAction(formData);
                    if (result.ok) {
                      redirect('/admin/conteudos');
                    }
                  }}
                >
                  <input type="hidden" name="id" value={course.id} />
                  <button
                    type="submit"
                    className="bg-destructive hover:bg-destructive/90 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Apagar definitivamente
                  </button>
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
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
        </section>
      </div>

      <CoursesColumn selectedId={course.id} />
    </div>
  );
}
