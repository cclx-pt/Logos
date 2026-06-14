/**
 * Sequenciação de aulas/módulos dentro de um curso (V3.6).
 *
 * Funções **puras** (sem I/O) sobre o `CourseDetail` já carregado e o `Set`
 * de aulas concluídas. Vivem aqui (não em `completion.ts`) para isolar a
 * regra de ordenação e facilitar o teste.
 *
 * **Regra:** num curso com `sequential = true`, as aulas têm de ser
 * concluídas pela ordem linear (module.position, lesson.position; o
 * `CourseDetail` já vem ordenado). Como a ordem é linear entre módulos,
 * isto força também a sequência de módulos.
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
  /** Ids de aulas bloqueadas (inacessíveis até concluir as anteriores). */
  lockedLessonIds: Set<string>;
  /** Ids de módulos bloqueados (todas as aulas bloqueadas). */
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
 * Calcula o estado de bloqueio sequencial do curso.
 *
 * - Curso não-sequencial → nada bloqueado.
 * - Uma aula está bloqueada se **não está concluída** e existe **alguma aula
 *   anterior por concluir**. A primeira aula por concluir (a "fronteira") fica
 *   sempre acessível, e aulas já concluídas nunca bloqueiam (permite rever,
 *   mesmo que tenham sido concluídas fora de ordem antes de o curso passar a
 *   sequencial).
 * - Um módulo está bloqueado quando **todas** as suas aulas estão bloqueadas
 *   (módulos vazios nunca bloqueiam — não há nada a concluir).
 */
export function getSequentialAccess(
  course: CourseDetail,
  completed: Set<string>,
): SequentialAccess {
  if (!course.sequential) return EMPTY_ACCESS;

  const lockedLessonIds = new Set<string>();
  let sawIncomplete = false;
  for (const lesson of flattenLessons(course)) {
    const done = completed.has(lesson.id);
    if (!done && sawIncomplete) {
      lockedLessonIds.add(lesson.id);
    }
    if (!done) sawIncomplete = true;
  }

  const lockedModuleIds = new Set<string>();
  for (const m of course.modules) {
    if (m.lessons.length > 0 && m.lessons.every((l) => lockedLessonIds.has(l.id))) {
      lockedModuleIds.add(m.id);
    }
  }

  return { lockedLessonIds, lockedModuleIds };
}

/**
 * Devolve a aula-fronteira (a próxima a fazer) para onde redireccionar quem
 * tenta abrir uma aula/módulo bloqueado. É a primeira aula por concluir na
 * ordem linear, ou `null` se o curso não tiver aulas / estiver tudo
 * concluído (nesse caso nada está bloqueado).
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
