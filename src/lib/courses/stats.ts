/**
 * Estatísticas leves por curso para o admin (V3 PR8).
 *
 * RLS de `course_access_log` permite SELECT só a admin/super_admin (PR2),
 * portanto chamar este helper de uma página não-admin devolveria zeros
 * (não falha, apenas filtra). As páginas que o chamam devem fazer o
 * gating de role antes.
 *
 * Conclusões de curso são derivadas on-read a partir de `lesson_completions`
 * (PR7) — `course_completions` continua não escrita em V3.
 */

import { getServerClient } from '@/lib/auth';

export type CourseStats = {
  totalAccesses: number;
  uniqueUsers: number;
  lessonCompletions: number;
};

export async function getCourseStats(courseId: string, lessonIds: string[]): Promise<CourseStats> {
  const supabase = await getServerClient();

  const { data: accessRows, error: accessError } = await supabase
    .from('course_access_log')
    .select('user_id')
    .eq('course_id', courseId)
    .returns<{ user_id: string }[]>();

  if (accessError) {
    throw new Error(`Falha a carregar acessos: ${accessError.message}`);
  }

  const rows = accessRows ?? [];
  const totalAccesses = rows.length;
  const uniqueUsers = new Set(rows.map((r) => r.user_id)).size;

  let lessonCompletions = 0;
  if (lessonIds.length > 0) {
    const { count, error: complError } = await supabase
      .from('lesson_completions')
      .select('*', { count: 'exact', head: true })
      .in('lesson_id', lessonIds);

    if (complError) {
      throw new Error(`Falha a carregar conclusões: ${complError.message}`);
    }
    lessonCompletions = count ?? 0;
  }

  return { totalAccesses, uniqueUsers, lessonCompletions };
}
