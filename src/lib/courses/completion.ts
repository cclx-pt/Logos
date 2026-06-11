/**
 * Helpers de conclusão de aulas e curso. RLS em `lesson_completions` e
 * `course_completions` (PR2) garante que cada utilizador só vê os seus
 * registos — `current_profile_id()` filtra no server.
 *
 * Estes helpers vivem em `src/lib/courses/` (não no `app/`) porque são
 * reutilizados pela página de curso, página de aula e ecrã "Curso
 * Concluído".
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';

import type { CourseDetail, LessonSummary, ModuleWithLessons } from './detail';

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
 * Devolve a primeira aula (na ordem do curso) ainda não concluída, ou
 * `null` se não houver aulas ou estiverem todas concluídas. Com o set
 * vazio devolve simplesmente a primeira aula do curso — por isso serve
 * os dois CTAs da página de curso: "Começar curso" (sem progresso) e
 * "Continuar curso" (retoma onde o utilizador parou, atravessando
 * fronteiras de módulo; módulos sem aulas são ignorados por natureza).
 */
export function getFirstIncompleteLesson(
  course: CourseDetail,
  completedLessonIds: Set<string>,
): LessonSummary | null {
  for (const m of course.modules) {
    for (const lesson of m.lessons) {
      if (!completedLessonIds.has(lesson.id)) return lesson;
    }
  }
  return null;
}

/**
 * Verdadeiro se todas as aulas (de todos os módulos) do curso estão
 * concluídas. Usado para o ecrã "Curso Concluído".
 */
export function isCourseComplete(course: CourseDetail, completedLessonIds: Set<string>): boolean {
  const allLessons = course.modules.flatMap((m) => m.lessons);
  if (allLessons.length === 0) return false;
  return allLessons.every((l) => completedLessonIds.has(l.id));
}

/**
 * Devolve o conjunto de courseIds que o utilizador actual já concluiu.
 * RLS em `course_completions` filtra para `own` — chamar sem sessão
 * devolve set vazio (sem query).
 *
 * Usado no catálogo `/conteudos` para greyout + badge "Concluído" em
 * cursos já terminados pelo utilizador, alinhando com a UX da secção
 * "Terminados" em `/meus-cursos`.
 */
export async function getCompletedCourseIdsForCurrentUser(): Promise<Set<string>> {
  const caller = await getCurrentUser();
  if (!caller) return new Set();

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('course_completions')
    .select('course_id')
    .returns<{ course_id: string }[]>();

  if (error) {
    throw new Error(`Falha a carregar cursos concluídos: ${error.message}`);
  }
  return new Set((data ?? []).map((r) => r.course_id));
}

/**
 * Devolve a data de conclusão do curso para o utilizador actual. Se ainda
 * não existir row em `course_completions`, insere uma agora — `completed_at`
 * fica preservado para sempre (RLS de PR2 garante imutabilidade: sem
 * UPDATE/DELETE policies).
 *
 * **Confia no caller**: só deve ser chamado depois de `isCourseComplete()`
 * devolver `true`. A regra "todas as aulas concluídas" não está em RLS — é
 * responsabilidade do caller server-side (a página de curso) verificar
 * antes de invocar este helper.
 *
 * Race condition entre dois page renders simultâneos é mitigada via 23505
 * trap (PK composta `(user_id, course_id)`): se outro request inseriu
 * entre o nosso select e o insert, fazemos refetch.
 *
 * Retorna `null` apenas se não houver sessão ou em erro inesperado —
 * nunca lança, para não partir o render do banner.
 */
export async function getOrCreateCourseCompletion(courseId: string): Promise<string | null> {
  const caller = await getCurrentUser();
  if (!caller) return null;

  const supabase = await getServerClient();

  const { data: existing } = await supabase
    .from('course_completions')
    .select('completed_at')
    .eq('user_id', caller.id)
    .eq('course_id', courseId)
    .maybeSingle<{ completed_at: string }>();

  if (existing) return existing.completed_at;

  const { data: inserted, error } = await supabase
    .from('course_completions')
    .insert({ user_id: caller.id, course_id: courseId })
    .select('completed_at')
    .maybeSingle<{ completed_at: string }>();

  if (error?.code === '23505') {
    const { data: raced } = await supabase
      .from('course_completions')
      .select('completed_at')
      .eq('user_id', caller.id)
      .eq('course_id', courseId)
      .maybeSingle<{ completed_at: string }>();
    return raced?.completed_at ?? null;
  }
  if (error) return null;
  return inserted?.completed_at ?? null;
}
