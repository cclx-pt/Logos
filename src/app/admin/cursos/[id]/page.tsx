import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { deleteCourseAction, updateCourseAction } from '../actions';
import { CourseForm, type CourseFormInitialData, type TagOption } from '../course-form';

export const metadata = {
  title: 'Editar curso · Área admin · LOGOS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ confirmar?: string }>;
};

export default async function EditarCursoPage({ params, searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    notFound();
  }

  const { id } = await params;
  if (!UUID_RE.test(id)) {
    notFound();
  }

  const { confirmar } = await searchParams;
  const isConfirmingDelete = confirmar === 'apagar';

  const supabase = await getServerClient();
  const [{ data: course, error: courseError }, { data: tagsData, error: tagsError }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('id, slug, title, description, icon, required_tags, published_at')
        .eq('id', id)
        .maybeSingle<CourseFormInitialData>(),
      supabase
        .from('tags')
        .select('id, slug, label')
        .order('label', { ascending: true })
        .returns<TagOption[]>(),
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

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
            Editar curso
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Editar metadados do curso <strong>{course.title}</strong>. Módulos e aulas são geridos
            numa secção separada (V3 PR4).
          </p>
        </div>
        <Link
          href="/admin/cursos"
          className="text-muted-foreground hover:text-ink text-sm transition-colors"
        >
          ← Voltar a Cursos
        </Link>
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

      <section
        aria-labelledby="zona-perigo-heading"
        className="border-destructive/30 bg-destructive/5 mt-10 rounded-lg border p-5"
      >
        <h2
          id="zona-perigo-heading"
          className="text-destructive text-sm font-semibold tracking-wide uppercase"
        >
          Zona de perigo
        </h2>
        {isConfirmingDelete ? (
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
                    redirect('/admin/cursos');
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
                href={`/admin/cursos/${course.id}`}
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
              href={`/admin/cursos/${course.id}?confirmar=apagar`}
              className="text-destructive border-destructive/30 hover:bg-destructive/10 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Apagar curso…
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
