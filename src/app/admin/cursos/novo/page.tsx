import { notFound, redirect } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { createCourseAction } from '../actions';
import { CourseForm, type TagOption } from '../course-form';

export const metadata = {
  title: 'Novo curso · Área admin · LOGOS',
};

export default async function NovoCursoPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    notFound();
  }

  const supabase = await getServerClient();
  const { data: tagsData, error: tagsError } = await supabase
    .from('tags')
    .select('id, slug, label')
    .order('label', { ascending: true })
    .returns<TagOption[]>();

  if (tagsError) {
    throw new Error(`Falha a carregar etiquetas: ${tagsError.message}`);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Novo curso</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Cria um novo curso. Fica como rascunho até marcares <strong>Publicado</strong>. Podes
          ajustar tudo mais tarde — slug, etiquetas, conteúdo.
        </p>
      </header>

      <CourseForm
        mode="create"
        tags={tagsData ?? []}
        action={async (formData: FormData) => {
          'use server';
          const result = await createCourseAction(formData);
          if (result.ok) {
            redirect(`/admin/cursos/${result.id}`);
          }
        }}
      />
    </div>
  );
}
