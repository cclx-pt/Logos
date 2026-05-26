/**
 * Helper para os badges "Em curso" / "Concluído ✓" nos cards de `/conteudos`
 * (V3.1 T6).
 *
 * Dado um conjunto de course ids, devolve um Record com flags `started` e
 * `completed` para cada um. Anónimos ⇒ Record vazio (UI aplica defaults).
 *
 * **RLS:**
 *   - `course_access_log` SELECT: `select_own` (V3.1 T4) + `select_admin`
 *     (PR2). Para users normais, só vê os próprios acessos.
 *   - `course_completions` SELECT: `select_own_or_admin` (PR2).
 *
 * Mantemos esta função separada de `getVisibleCoursesForUser` para não
 * inflacionar o `VisibleCourse` com campos opcionais. A página `/conteudos`
 * faz o join client-side (ver `src/app/conteudos/page.tsx`).
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';

export type CourseProgress = {
  /** `true` se há pelo menos uma entrada em `course_access_log` para este curso. */
  started: boolean;
  /** `true` se há uma row em `course_completions` para este curso. */
  completed: boolean;
};

export async function getCourseProgressForUser(
  courseIds: string[],
): Promise<Record<string, CourseProgress>> {
  if (courseIds.length === 0) return {};
  const caller = await getCurrentUser();
  if (!caller) return {};

  const supabase = await getServerClient();

  // Duas queries em paralelo — ambas filtradas ao set fornecido para evitar
  // carregar o histórico completo do utilizador.
  const [accessRes, completionsRes] = await Promise.all([
    supabase
      .from('course_access_log')
      .select('course_id')
      .in('course_id', courseIds)
      .returns<{ course_id: string }[]>(),
    supabase
      .from('course_completions')
      .select('course_id')
      .in('course_id', courseIds)
      .returns<{ course_id: string }[]>(),
  ]);

  if (accessRes.error) {
    throw new Error(`Falha a carregar acessos: ${accessRes.error.message}`);
  }
  if (completionsRes.error) {
    throw new Error(`Falha a carregar conclusões: ${completionsRes.error.message}`);
  }

  const startedSet = new Set((accessRes.data ?? []).map((r) => r.course_id));
  const completedSet = new Set((completionsRes.data ?? []).map((r) => r.course_id));

  const result: Record<string, CourseProgress> = {};
  for (const id of courseIds) {
    result[id] = {
      started: startedSet.has(id),
      completed: completedSet.has(id),
    };
  }
  return result;
}
