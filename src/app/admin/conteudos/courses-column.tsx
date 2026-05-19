import Link from 'next/link';

import { getServerClient } from '@/lib/auth';
import { cn } from '@/lib/utils';

type CourseRow = {
  id: string;
  title: string;
  published_at: string | null;
};

type Props = { selectedId?: string };

/**
 * Coluna de navegação dos cursos — usada nas páginas drill-down de
 * /admin/conteudos. Escondida em mobile (`md:hidden`) — em mobile o contexto
 * vem do breadcrumb. Renderiza-se como Server Component: fetch directo a
 * Supabase via getServerClient, sem props pesadas.
 */
export async function CoursesColumn({ selectedId }: Props) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, published_at')
    .order('title', { ascending: true })
    .returns<CourseRow[]>();

  if (error) {
    throw new Error(`Falha a carregar cursos: ${error.message}`);
  }

  const courses = data ?? [];

  return (
    <aside aria-label="Cursos" className="hidden w-56 shrink-0 md:block">
      <div className="border-border bg-card rounded-lg border p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">Cursos</h2>
          <span className="text-muted-foreground text-xs tabular-nums">{courses.length}</span>
        </div>
        {courses.length === 0 ? (
          <p className="text-muted-foreground text-xs">Ainda não há cursos.</p>
        ) : (
          <nav className="-mx-1 flex flex-col gap-0.5" aria-label="Navegação de cursos">
            {courses.map((course) => {
              const isSelected = course.id === selectedId;
              return (
                <Link
                  key={course.id}
                  href={`/admin/conteudos/${course.id}`}
                  aria-current={isSelected ? 'page' : undefined}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-orange-primary/10 text-orange-primary font-medium'
                      : 'text-ink hover:bg-muted/40',
                  )}
                >
                  <span className="line-clamp-1">{course.title}</span>
                  {!course.published_at && (
                    <span className="text-muted-foreground text-[10px] tracking-wide uppercase">
                      rascunho
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        )}
        <Link
          href="/admin/conteudos/novo"
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring mt-4 inline-flex h-9 w-full items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          + Novo curso
        </Link>
      </div>
    </aside>
  );
}

/**
 * Breadcrumb visível apenas em mobile (admin sidebar e CoursesColumn estão
 * `hidden md:block`, por isso em mobile o utilizador precisa de uma forma de
 * voltar a Cursos). Em desktop é redundante.
 */
export function ConteudosBreadcrumb({ courseTitle }: { courseTitle?: string }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="text-muted-foreground mb-6 flex items-center gap-2 text-xs md:hidden"
    >
      <Link href="/admin/conteudos" className="hover:text-ink transition-colors">
        Cursos
      </Link>
      {courseTitle ? (
        <>
          <span aria-hidden="true">›</span>
          <span className="text-ink line-clamp-1">{courseTitle}</span>
        </>
      ) : null}
    </nav>
  );
}
