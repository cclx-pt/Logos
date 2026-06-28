/**
 * Sequenciação de aulas/módulos dentro de um curso (V3.6).
 *
 * Funções **puras** (sem I/O) sobre o `CourseDetail` já carregado e o `Set`
 * de aulas concluídas. Vivem aqui (não em `completion.ts`) para isolar a
 * regra de ordenação e facilitar o teste.
 *
 * **Dois controlos independentes por curso:**
 *   - `sequentialLessons` - as aulas têm de ser concluídas pela ordem
 *     **dentro de cada módulo** (a aula 2 exige a aula 1 do mesmo módulo).
 *   - `sequentialModules` - um módulo só abre depois de o módulo anterior
 *     (com aulas) estar **totalmente concluído**.
 *   São ortogonais: pode-se exigir ordem só das aulas, só dos módulos, ambas
 *   ou nenhuma.
 *
 * **Bloqueio (decisão de UX 14-06-2026): mostrar bloqueado com dica**, não
 * esconder. Estas funções dizem *o que* está bloqueado; a UI mostra a dica
 * e o gating server-side (páginas) redirecciona para a fronteira.
 *
 * Pré-requisitos *de curso* (curso B exige concluir curso A) vivem à parte:
 * a flag depende de `course_completions`, não da ordem interna. Ver
 * `prerequisite` em `CourseDetail` e o gate em `enrollment.ts`.
 */

import type { CourseDetail, LessonSummary, ModuleWithLessons } from './detail';

export type SequentialAccess = {
  /** Ids de aulas bloqueadas (inacessíveis até concluir o conteúdo anterior). */
  lockedLessonIds: Set<string>;
  /** Ids de módulos bloqueados por `sequentialModules` (não-abríveis ainda). */
  lockedModuleIds: Set<string>;
};

const EMPTY_ACCESS: SequentialAccess = {
  lockedLessonIds: new Set(),
  lockedModuleIds: new Set(),
};

/** Aulas do curso na ordem linear (assume `course.modules` já ordenado). */
export function flattenLessons(course: CourseDetail): LessonSummary[] {
  return course.modules.flatMap((m) => m.lessons);
}

/**
 * Calcula o estado de bloqueio sequencial do curso a partir das duas flags.
 *
 * - **Módulos** (`sequentialModules`): um módulo com aulas fica bloqueado se
 *   algum módulo **anterior com aulas** não estiver totalmente concluído.
 *   Módulos vazios não contam (não bloqueiam nem são bloqueados).
 * - **Aulas** (`sequentialLessons`): dentro de um módulo, uma aula está
 *   bloqueada se existir **alguma aula anterior do mesmo módulo** por
 *   concluir. A primeira por concluir do módulo (a "fronteira" do módulo)
 *   fica acessível.
 * - Um módulo bloqueado (por `sequentialModules`) tranca **todas** as suas
 *   aulas. Aulas já concluídas nunca bloqueiam (permite rever, mesmo que
 *   tenham sido concluídas fora de ordem antes de o curso passar a sequencial).
 */
export function getSequentialAccess(
  course: CourseDetail,
  completed: Set<string>,
): SequentialAccess {
  const { sequentialLessons, sequentialModules } = course;
  if (!sequentialLessons && !sequentialModules) return EMPTY_ACCESS;

  // 1) Módulos bloqueados por sequência de módulos.
  const lockedModuleIds = new Set<string>();
  if (sequentialModules) {
    let priorIncomplete = false;
    for (const m of course.modules) {
      if (m.lessons.length === 0) continue; // módulos vazios não participam
      if (priorIncomplete) lockedModuleIds.add(m.id);
      const moduleComplete = m.lessons.every((l) => completed.has(l.id));
      if (!moduleComplete) priorIncomplete = true;
    }
  }

  // 2) Aulas bloqueadas: módulo bloqueado tranca todas; senão, ordem
  //    dentro do módulo (se sequentialLessons).
  const lockedLessonIds = new Set<string>();
  for (const m of course.modules) {
    const moduleGated = lockedModuleIds.has(m.id);
    let priorLessonIncomplete = false;
    for (const lesson of m.lessons) {
      const done = completed.has(lesson.id);
      const locked = moduleGated || (sequentialLessons && priorLessonIncomplete);
      if (locked && !done) lockedLessonIds.add(lesson.id);
      if (!done) priorLessonIncomplete = true;
    }
  }

  return { lockedLessonIds, lockedModuleIds };
}

/**
 * Devolve a aula-fronteira (a próxima a fazer) para onde redireccionar quem
 * tenta abrir uma aula/módulo bloqueado. É a primeira aula por concluir na
 * ordem linear - que é **sempre acessível**: todas as aulas anteriores estão
 * concluídas, logo o seu módulo não está bloqueado e não há aula anterior do
 * mesmo módulo por concluir. `null` se o curso não tiver aulas / estiver tudo
 * concluído.
 */
export function getFrontierLesson(
  course: CourseDetail,
  completed: Set<string>,
): LessonSummary | null {
  for (const lesson of flattenLessons(course)) {
    if (!completed.has(lesson.id)) return lesson;
  }
  return null;
}

/**
 * Módulo que contém uma dada aula. Usado para redireccionar da página de
 * módulo bloqueado para o módulo da aula-fronteira.
 */
export function findModuleOfLesson(
  course: CourseDetail,
  lessonId: string,
): ModuleWithLessons | null {
  return course.modules.find((m) => m.lessons.some((l) => l.id === lessonId)) ?? null;
}
