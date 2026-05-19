/**
 * Helpers de conclusão de aulas. RLS em `lesson_completions` (PR2)
 * garante que cada utilizador só vê os seus registos — `current_profile_id()`
 * filtra no server.
 *
 * Estes helpers vivem em `src/lib/courses/` (não no `app/`) porque vão ser
 * reutilizados pela página de curso, página de aula e (futura) página
 * "Curso Concluído" da PR7.
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';

import type { CourseDetail, ModuleWithLessons } from './detail';

/**
 * Devolve o conjunto de ids das aulas concluídas pelo utilizador actual,
 * limitado aos `lessonIds` fornecidos (para evitar carregar conclusões de
 * outros cursos). Retorna `Set` vazio se não houver sessão ou se o array
 * de input vier vazio.
 */
export async function getCompletedLessonIds(lessonIds: string[]): Promise<Set<string>> {
  if (lessonIds.length === 0) return new Set();
  const caller = await getCurrentUser();
  if (!caller) return new Set();

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('lesson_completions')
    .select('lesson_id')
    .in('lesson_id', lessonIds)
    .returns<{ lesson_id: string }[]>();

  if (error) {
    throw new Error(`Falha a carregar conclusões: ${error.message}`);
  }

  return new Set((data ?? []).map((r) => r.lesson_id));
}

/**
 * Verdadeiro quando todas as aulas do módulo estão no set de concluídas.
 * Módulo sem aulas → `false` (não há nada para concluir; não faz sentido
 * tratar como "concluído").
 */
export function isModuleComplete(
  module: ModuleWithLessons,
  completedLessonIds: Set<string>,
): boolean {
  if (module.lessons.length === 0) return false;
  return module.lessons.every((l) => completedLessonIds.has(l.id));
}

/**
 * Devolve o módulo seguinte (com aulas) no curso, ou `null` se for o último
 * com aulas. Salta módulos sem aulas — não fazem parte da progressão.
 */
export function getNextModuleWithLessons(
  course: CourseDetail,
  currentModuleId: string,
): ModuleWithLessons | null {
  const idx = course.modules.findIndex((m) => m.id === currentModuleId);
  if (idx === -1) return null;
  for (let i = idx + 1; i < course.modules.length; i++) {
    const m = course.modules[i]!;
    if (m.lessons.length > 0) return m;
  }
  return null;
}

/**
 * Verdadeiro se todas as aulas (de todos os módulos) do curso estão
 * concluídas. Usado para o ecrã "Curso Concluído" (a finalizar em PR7).
 */
export function isCourseComplete(course: CourseDetail, completedLessonIds: Set<string>): boolean {
  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) return false;
  return allLessons.every((l) => completedLessonIds.has(l.id));
}
