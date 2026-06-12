import Link from 'next/link';
import { Check, ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { ModuleWithLessons } from '@/lib/courses/detail';

type Props = {
  courseId: string;
  modules: ModuleWithLessons[];
  /** Ids das aulas concluídas pelo utilizador (curso inteiro). */
  completedLessonIds: Set<string>;
  currentLessonId: string;
  currentModuleId: string;
};

/**
 * LessonTree - árvore de navegação da vista de aula (item 3 de V3.4).
 * Espelho público da `CourseTree` do admin: módulos colapsáveis (`<details>`,
 * zero JS) com as suas aulas, cada uma a ligar para `/conteudos/[courseId]/
 * [lessonId]`. Apresentacional - recebe os dados já carregados pela página
 * (sem query própria).
 *
 * Estado por aula: aula concluída mostra ✓ + título riscado; a atual fica
 * destacada a laranja. O módulo atual abre sozinho (`<details open>`).
 *
 * Visibilidade: escondida até `xl` (≥1280px), à direita do conteúdo. Em
 * ecrãs menores a navegação faz-se pelo botão "Voltar ao curso", pela
 * navegação inferior e pela página de módulo.
 */
export function LessonTree({
  courseId,
  modules,
  completedLessonIds,
  currentLessonId,
  currentModuleId,
}: Props) {
  return (
    <aside aria-label="Aulas do curso" className="hidden w-64 shrink-0 xl:block">
      {/* `top-20` desce abaixo do cabeçalho sticky (h-16); `max-h`+overflow
          mantêm o quadrado todo visível com margem e fazem scroll interno se
          a árvore for mais alta que o ecrã. */}
      <div className="border-border bg-card sticky top-20 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border p-4">
        <header className="border-border mb-3 border-b pb-2">
          <h2 className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
            Aulas do curso
          </h2>
        </header>
        <ol className="space-y-1">
          {modules.map((module, moduleIndex) => {
            const isCurrentModule = module.id === currentModuleId;
            return (
              <li key={module.id}>
                <details open={isCurrentModule} className="group">
                  <summary className="hover:bg-muted/40 flex cursor-pointer list-none items-center gap-1 rounded-md px-1.5 py-1 transition-colors">
                    <ChevronRight
                      aria-hidden="true"
                      className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform group-open:rotate-90"
                    />
                    <span className="text-ink min-w-0 flex-1 truncate text-sm font-medium">
                      <span className="text-muted-foreground tabular-nums">{moduleIndex + 1}.</span>{' '}
                      {module.title}
                    </span>
                  </summary>
                  <ul className="border-border mt-1 ml-2 space-y-0.5 border-l pl-3">
                    {module.lessons.length === 0 ? (
                      <li className="text-muted-foreground px-1.5 py-1 text-xs italic">
                        Sem aulas
                      </li>
                    ) : (
                      module.lessons.map((lesson, lessonIndex) => {
                        const isCurrent = lesson.id === currentLessonId;
                        const isDone = completedLessonIds.has(lesson.id);
                        return (
                          <li key={lesson.id}>
                            <Link
                              href={`/conteudos/${courseId}/${lesson.id}`}
                              aria-current={isCurrent ? 'page' : undefined}
                              className={cn(
                                'flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors',
                                isCurrent
                                  ? 'bg-orange-primary/10 text-orange-primary font-medium'
                                  : 'text-ink hover:bg-muted/40',
                              )}
                            >
                              {isDone ? (
                                <Check
                                  aria-label="Concluída"
                                  className="text-orange-primary h-3 w-3 shrink-0"
                                />
                              ) : (
                                <span className="text-muted-foreground shrink-0 tabular-nums">
                                  {moduleIndex + 1}.{lessonIndex + 1}
                                </span>
                              )}
                              <span
                                className={cn(
                                  'truncate',
                                  isDone && !isCurrent && 'text-muted-foreground line-through',
                                )}
                              >
                                {lesson.title}
                              </span>
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
      </div>
    </aside>
  );
}
