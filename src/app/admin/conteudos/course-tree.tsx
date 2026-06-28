import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { getServerClient } from '@/lib/auth';
import { cn } from '@/lib/utils';

type ModuleRow = {
  id: string;
  title: string;
  position: number;
  lessons: LessonRow[] | null;
};

type LessonRow = {
  id: string;
  title: string;
  position: number;
};

export type CourseTreeProps = {
  courseId: string;
  /** Título do curso — mostrado no header da árvore para situar o utilizador. */
  courseTitle: string;
  /** Módulo actualmente em foco (página `/admin/conteudos/[courseId]/[moduleId]`). */
  currentModuleId?: string;
  /** Aula actualmente em edit (search param `?editar=<lessonId>`). */
  currentLessonId?: string;
};

/**
 * CourseTree — terceira coluna do drill-down de Conteúdos. Mostra a árvore
 * do curso actual (módulos colapsáveis ↪ aulas) e permite saltar
 * directamente para qualquer aula em modo edit. Usa `<details>` puro para
 * abrir/fechar — zero JavaScript no cliente.
 *
 * Visibilidade:
 *   - mobile/md/lg: escondida (`hidden xl:block`).
 *   - xl+ (≥1280px): visível à direita do conteúdo principal.
 *
 * Default-open: o módulo actual abre sozinho via `<details open>`.
 *
 * Clicar numa aula leva a `/admin/conteudos/[courseId]/[moduleId]?editar=<id>`
 * — o estado "aula" no admin vive em search param, por isso o salto entre
 * aulas é uma simples navegação na mesma página de módulo.
 */
export async function CourseTree({
  courseId,
  courseTitle,
  currentModuleId,
  currentLessonId,
}: CourseTreeProps) {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('modules')
    .select('id, title, position, lessons ( id, title, position )')
    .eq('course_id', courseId)
    .order('position', { ascending: true })
    .returns<ModuleRow[]>();

  if (error) {
    throw new Error(`Falha a carregar árvore do curso: ${error.message}`);
  }

  const modules = data ?? [];

  return (
    <aside aria-label="Estrutura do curso" className="hidden w-60 shrink-0 xl:block">
      <div className="border-border bg-card rounded-lg border p-4">
        <header className="border-border mb-3 border-b pb-2">
          <h2 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Estrutura
          </h2>
          <p
            className="font-display text-ink mt-0.5 truncate text-base font-medium"
            title={courseTitle}
          >
            {courseTitle}
          </p>
        </header>
        {modules.length === 0 ? (
          <p className="text-muted-foreground text-xs">Ainda não há módulos neste curso.</p>
        ) : (
          <ol className="space-y-1">
            {modules.map((module, moduleIndex) => {
              const isCurrentModule = module.id === currentModuleId;
              const isFocusedModuleHeader = isCurrentModule && !currentLessonId;
              const lessons = (module.lessons ?? [])
                .slice()
                .sort((a, b) => a.position - b.position);
              return (
                <li key={module.id}>
                  <details open={isCurrentModule} className="group">
                    <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-1 transition-colors">
                      <ChevronRight
                        aria-hidden="true"
                        className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
                      />
                      <Link
                        href={`/admin/conteudos/${courseId}/${module.id}`}
                        aria-current={isFocusedModuleHeader ? 'page' : undefined}
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm transition-colors',
                          isFocusedModuleHeader
                            ? 'text-orange-primary font-medium'
                            : 'text-ink hover:text-orange-primary',
                        )}
                      >
                        <span className="text-muted-foreground tabular-nums">
                          {moduleIndex + 1}.
                        </span>{' '}
                        {module.title}
                      </Link>
                    </summary>
                    <ul className="border-border mt-1 ml-2 space-y-0.5 border-l pl-3">
                      {lessons.length === 0 ? (
                        <li className="text-muted-foreground px-1.5 py-1 text-xs italic">
                          Sem aulas
                        </li>
                      ) : (
                        lessons.map((lesson, lessonIndex) => {
                          const isCurrentLesson = lesson.id === currentLessonId;
                          return (
                            <li key={lesson.id}>
                              <Link
                                href={`/admin/conteudos/${courseId}/${module.id}?editar=${lesson.id}`}
                                aria-current={isCurrentLesson ? 'page' : undefined}
                                className={cn(
                                  'block truncate rounded-md px-1.5 py-1 text-xs transition-colors',
                                  isCurrentLesson
                                    ? 'bg-orange-primary/10 text-orange-primary font-medium'
                                    : 'text-ink hover:bg-muted/40',
                                )}
                              >
                                <span className="text-muted-foreground tabular-nums">
                                  {moduleIndex + 1}.{lessonIndex + 1}
                                </span>{' '}
                                {lesson.title}
                              </Link>
                            </li>
                          );
                        })
                      )}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </aside>
  );
}
