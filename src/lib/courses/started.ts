/**
 * Helper para a rota `/meus-cursos` (V3.1 T4).
 *
 * Devolve os cursos que o utilizador actual começou — entendido como "tem
 * pelo menos uma row em `course_access_log`". Ordenação pela data do último
 * acesso (mais recente primeiro). Enriquece com flag `completed` (lookup em
 * `course_completions`).
 *
 * **RLS:**
 *   - `course_access_log` SELECT: `select_own` (V3.1 T4) + `select_admin` (PR2)
 *     compõem OR. Para o utilizador comum, só vê as suas próprias rows.
 *   - `courses` SELECT: `course_is_visible` (PR2). Se um curso é despublicado
 *     ou perde a etiqueta requerida depois do user lhe ter acedido, a row
 *     `course_access_log` continua válida mas o embed devolve `null` no
 *     `courses` — filtramos esses na agregação.
 *   - `course_completions` SELECT: `select_own_or_admin` (PR2).
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';

import { getBannerUrlsByPath } from './banner';
import type { VisibleCourse } from './visibility';

export type StartedCourse = VisibleCourse & {
  /** `true` se existe row em `course_completions` para este (user, curso). */
  completed: boolean;
  /** ISO timestamp do último acesso registado. Determina a ordenação. */
  lastAccessedAt: string;
};

type AccessRow = {
  course_id: string;
  accessed_at: string;
  courses: {
    id: string;
    title: string;
    description: string | null;
    icon: string | null;
    banner_storage_path: string | null;
    modules: { lessons: { count: number }[] | null }[] | null;
  } | null;
};

export async function getStartedCoursesForUser(): Promise<StartedCourse[]> {
  const caller = await getCurrentUser();
  if (!caller) return [];

  const supabase = await getServerClient();

  // Pull access log + embed do curso. Ordenado desc → o primeiro de cada
  // course_id é o acesso mais recente. RLS de course_access_log limita a
  // rows do próprio (V3.1 T4); RLS de courses filtra os que deixaram de
  // estar visíveis (despublicados / etiqueta retirada).
  const { data: accesses, error: accessError } = await supabase
    .from('course_access_log')
    .select(
      'course_id, accessed_at, courses ( id, title, description, icon, banner_storage_path, modules ( lessons ( count ) ) )',
    )
    .order('accessed_at', { ascending: false })
    .returns<AccessRow[]>();

  if (accessError) {
    throw new Error(`Falha a carregar acessos: ${accessError.message}`);
  }

  // Acumular paths para sign batched depois do dedupe.
  const dedupe = new Map<
    string,
    Omit<StartedCourse, 'bannerUrl'> & { bannerStoragePath: string | null }
  >();
  for (const row of accesses ?? []) {
    if (!row.courses) continue; // curso despublicado / sem visibilidade
    if (dedupe.has(row.course_id)) continue; // mantém a primeira (mais recente)
    dedupe.set(row.course_id, {
      id: row.courses.id,
      title: row.courses.title,
      description: row.courses.description,
      icon: row.courses.icon,
      bannerStoragePath: row.courses.banner_storage_path,
      hasLessons: (row.courses.modules ?? []).some((m) => (m.lessons?.[0]?.count ?? 0) > 0),
      completed: false,
      lastAccessedAt: row.accessed_at,
    });
  }

  const intermediate = Array.from(dedupe.values());
  if (intermediate.length === 0) return [];

  const bannerPaths = intermediate
    .map((c) => c.bannerStoragePath)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  const bannerUrls = await getBannerUrlsByPath(bannerPaths);

  const courses: StartedCourse[] = intermediate.map(({ bannerStoragePath, ...rest }) => ({
    ...rest,
    bannerUrl: bannerStoragePath ? (bannerUrls.get(bannerStoragePath) ?? null) : null,
  }));

  // Marca os concluídos. Limita o IN ao set actual para evitar varrer
  // course_completions inteiro do user.
  const courseIds = courses.map((c) => c.id);
  const { data: completions, error: completionsError } = await supabase
    .from('course_completions')
    .select('course_id')
    .in('course_id', courseIds)
    .returns<{ course_id: string }[]>();

  if (completionsError) {
    throw new Error(`Falha a carregar conclusões: ${completionsError.message}`);
  }

  const completedSet = new Set((completions ?? []).map((r) => r.course_id));
  return courses.map((c) => ({ ...c, completed: completedSet.has(c.id) }));
}
