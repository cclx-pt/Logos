import { notFound } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { createCourseAction } from '../courses-actions';
import { CourseForm, type CourseOption, type TagOption } from '../course-form';
import { ConteudosBreadcrumb } from '../conteudos-breadcrumb';

export const metadata = {
  title: 'Novo curso · Área admin · LOGOS',
};

export default async function NovoCursoPage() {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const supabase = await getServerClient();
  const [{ data: tagsData, error: tagsError }, { data: courseOptions, error: coursesError }] =
    await Promise.all([
      supabase
        .from('tags')
        .select('id, label')
        .order('label', { ascending: true })
        .returns<TagOption[]>(),
      supabase
        .from('courses')
        .select('id, title')
        .order('title', { ascending: true })
        .returns<CourseOption[]>(),
    ]);

  if (tagsError) {
    throw new Error(`Falha a carregar etiquetas: ${tagsError.message}`);
  }
  if (coursesError) {
    throw new Error(`Falha a carregar cursos: ${coursesError.message}`);
  }

  return (
    <div className="min-w-0 space-y-6">
      <ConteudosBreadcrumb courseTitle="Novo curso" />
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Novo curso</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Cria um novo curso. Fica como rascunho até marcares <strong>Publicado</strong>. Podes
          ajustar tudo mais tarde — título, etiquetas, conteúdo.
        </p>
      </header>

      <CourseForm
        mode="create"
        tags={tagsData ?? []}
        courseOptions={courseOptions ?? []}
        submitAction={createCourseAction}
      />
    </div>
  );
}
