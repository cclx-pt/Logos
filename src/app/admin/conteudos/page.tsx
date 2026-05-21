import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getCurrentUser, getServerClient } from '@/lib/auth';

export const metadata = {
  title: 'Conteúdos · Área admin · LOGOS',
};

type CourseRow = {
  id: string;
  title: string;
  published_at: string | null;
  required_tags: string[];
  created_at: string;
};

type TagRow = { id: string; label: string };

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function ConteudosPage() {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    notFound();
  }

  const supabase = await getServerClient();
  const [{ data: coursesData, error: coursesError }, { data: tagsData, error: tagsError }] =
    await Promise.all([
      supabase
        .from('courses')
        .select('id, title, published_at, required_tags, created_at')
        .order('created_at', { ascending: false })
        .returns<CourseRow[]>(),
      supabase.from('tags').select('id, label').returns<TagRow[]>(),
    ]);

  if (coursesError) {
    throw new Error(`Falha a carregar cursos: ${coursesError.message}`);
  }
  if (tagsError) {
    throw new Error(`Falha a carregar etiquetas: ${tagsError.message}`);
  }

  const courses = coursesData ?? [];
  const tagsById = new Map((tagsData ?? []).map((t) => [t.id, t.label] as const));

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Conteúdos</h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Cursos da plataforma LOGOS. Clica num curso para gerir os seus módulos e aulas.
            Rascunhos só aparecem aqui na área admin.
          </p>
        </div>
        <Link
          href="/admin/conteudos/novo"
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Novo curso
        </Link>
      </header>

      <section aria-labelledby="cursos-heading" className="space-y-3">
        <h2 id="cursos-heading" className="text-ink text-sm font-semibold tracking-wide uppercase">
          Cursos existentes ({courses.length})
        </h2>
        {courses.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ainda não há cursos. Cria o primeiro com o botão acima.
          </p>
        ) : (
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Título
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Etiquetas
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Criado em
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {courses.map((course) => {
                  const tagLabels = course.required_tags
                    .map((id) => tagsById.get(id))
                    .filter((label): label is string => typeof label === 'string');

                  return (
                    <tr key={course.id} className="text-ink align-top">
                      <td className="px-4 py-3 font-medium">
                        <Link
                          href={`/admin/conteudos/${course.id}`}
                          className="hover:text-orange-primary transition-colors"
                        >
                          {course.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {course.published_at ? (
                          <span className="bg-sage-card text-ink inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                            Publicado
                          </span>
                        ) : (
                          <span className="bg-butter-card text-ink inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium">
                            Rascunho
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {tagLabels.length === 0 ? (
                          <span className="text-muted-foreground text-xs">Público</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {tagLabels.map((label) => (
                              <span
                                key={label}
                                className="bg-cream-card text-ink rounded-full px-2 py-0.5 text-xs"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">{formatDate(course.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/conteudos/${course.id}`}
                          className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Abrir →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
