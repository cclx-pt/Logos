/**
 * Estatísticas por utilizador (V3 pull-forward de V5) — **só super_admin**.
 *
 * Mostra, por utilizador, quantos cursos tem inscritos (activos) e quantos
 * terminou; e, por utilizador, a lista desses cursos. Lê `profiles` (nomes,
 * PII) — cujo RLS só dá SELECT ao próprio ou a super_admin — por isso os
 * getters recusam (devolvem `null`) se o caller não for super_admin.
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';
import type { Role } from '@/lib/auth';

export type ProfileRow = { id: string; display_name: string; role: Role };
export type AccessRow = {
  user_id: string;
  course_id: string;
  accessed_at: string;
  unenrolled_at: string | null;
};
export type CourseCompletionRow = { user_id: string; course_id: string };

export type UserOverviewRow = {
  userId: string;
  name: string;
  role: Role;
  enrolled: number;
  completed: number;
};

/**
 * Inscrições activas por (user, course): a row mais recente em
 * `course_access_log` tem `unenrolled_at IS NULL`. Devolve um Set de chaves
 * `"<user> <course>"`. Partilhado entre a visão por-utilizador e o detalhe.
 */
export function activeEnrollmentKeys(accesses: AccessRow[]): Set<string> {
  const latest = new Map<string, { accessed_at: string; unenrolled_at: string | null }>();
  for (const a of accesses) {
    const key = `${a.user_id} ${a.course_id}`;
    const prev = latest.get(key);
    if (!prev || a.accessed_at > prev.accessed_at) {
      latest.set(key, { accessed_at: a.accessed_at, unenrolled_at: a.unenrolled_at });
    }
  }
  const active = new Set<string>();
  for (const [key, l] of latest) {
    if (l.unenrolled_at === null) active.add(key);
  }
  return active;
}

export function aggregateUsersOverview(input: {
  profiles: ProfileRow[];
  accesses: AccessRow[];
  courseCompletions: CourseCompletionRow[];
}): UserOverviewRow[] {
  const activeKeys = activeEnrollmentKeys(input.accesses);
  const enrolledByUser = new Map<string, number>();
  for (const key of activeKeys) {
    const userId = key.slice(0, key.indexOf(' '));
    enrolledByUser.set(userId, (enrolledByUser.get(userId) ?? 0) + 1);
  }

  const completedByUser = new Map<string, number>();
  for (const c of input.courseCompletions) {
    completedByUser.set(c.user_id, (completedByUser.get(c.user_id) ?? 0) + 1);
  }

  return input.profiles
    .map((p) => ({
      userId: p.id,
      name: p.display_name,
      role: p.role,
      enrolled: enrolledByUser.get(p.id) ?? 0,
      completed: completedByUser.get(p.id) ?? 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt'));
}

export type UserCourse = { courseId: string; title: string };
export type UserCompletedCourse = { courseId: string; title: string; completedAt: string };

export function aggregateUserDetail(input: {
  courses: { id: string; title: string }[];
  /** Acessos APENAS deste utilizador. */
  accesses: AccessRow[];
  /** Conclusões APENAS deste utilizador. */
  completions: { course_id: string; completed_at: string }[];
}): { enrolled: UserCourse[]; completed: UserCompletedCourse[] } {
  const titleById = new Map(input.courses.map((c) => [c.id, c.title]));
  const activeKeys = activeEnrollmentKeys(input.accesses);

  const enrolled: UserCourse[] = [];
  for (const key of activeKeys) {
    const courseId = key.slice(key.indexOf(' ') + 1);
    enrolled.push({ courseId, title: titleById.get(courseId) ?? 'Curso removido' });
  }
  enrolled.sort((a, b) => a.title.localeCompare(b.title, 'pt'));

  const completed: UserCompletedCourse[] = input.completions
    .map((c) => ({
      courseId: c.course_id,
      title: titleById.get(c.course_id) ?? 'Curso removido',
      completedAt: c.completed_at,
    }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));

  return { enrolled, completed };
}

/** Lista de utilizadores com contagens. `null` se o caller não for super_admin. */
export async function getUsersOverview(): Promise<UserOverviewRow[] | null> {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller.role)) return null;

  const supabase = await getServerClient();
  const [profilesRes, accessRes, complRes] = await Promise.all([
    supabase.from('profiles').select('id, display_name, role').returns<ProfileRow[]>(),
    supabase
      .from('course_access_log')
      .select('user_id, course_id, accessed_at, unenrolled_at')
      .returns<AccessRow[]>(),
    supabase
      .from('course_completions')
      .select('user_id, course_id')
      .returns<CourseCompletionRow[]>(),
  ]);

  const firstError = profilesRes.error ?? accessRes.error ?? complRes.error;
  if (firstError) throw new Error(`Falha a carregar utilizadores: ${firstError.message}`);

  return aggregateUsersOverview({
    profiles: profilesRes.data ?? [],
    accesses: accessRes.data ?? [],
    courseCompletions: complRes.data ?? [],
  });
}

export type UserStatsDetailResult = {
  name: string;
  role: Role;
  enrolled: UserCourse[];
  completed: UserCompletedCourse[];
};

/** Detalhe de um utilizador. `null` se não for super_admin ou se não existir. */
export async function getUserStatsDetail(userId: string): Promise<UserStatsDetailResult | null> {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller.role) || !UUID_RE.test(userId)) return null;

  const supabase = await getServerClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, display_name, role')
    .eq('id', userId)
    .maybeSingle<ProfileRow>();
  if (profileError) throw new Error(`Falha a carregar utilizador: ${profileError.message}`);
  if (!profile) return null;

  const [coursesRes, accessRes, complRes] = await Promise.all([
    supabase.from('courses').select('id, title').returns<{ id: string; title: string }[]>(),
    supabase
      .from('course_access_log')
      .select('user_id, course_id, accessed_at, unenrolled_at')
      .eq('user_id', userId)
      .returns<AccessRow[]>(),
    supabase
      .from('course_completions')
      .select('course_id, completed_at')
      .eq('user_id', userId)
      .returns<{ course_id: string; completed_at: string }[]>(),
  ]);

  const firstError = coursesRes.error ?? accessRes.error ?? complRes.error;
  if (firstError) throw new Error(`Falha a carregar detalhe: ${firstError.message}`);

  const { enrolled, completed } = aggregateUserDetail({
    courses: coursesRes.data ?? [],
    accesses: accessRes.data ?? [],
    completions: complRes.data ?? [],
  });

  return { name: profile.display_name, role: profile.role, enrolled, completed };
}
