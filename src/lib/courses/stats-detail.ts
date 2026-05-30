/**
 * Detalhe de estatísticas de um curso (V3 pull-forward de V5).
 *
 * Números por módulo e por aula (visitas, visitas únicas, conclusões) + totais
 * do curso (inscrições activas, finalizações, acessos totais/únicos). A lista
 * de "quem terminou" (com nomes) é **só para super_admin** — `profiles` só dá
 * SELECT ao próprio ou a super_admin (RLS). Para admins normais devolvemos
 * `finishers: null` (a UI mostra só a contagem).
 *
 * Tudo lido de tabelas existentes + `lesson_views` (migration 20260530130000).
 * Sem percentagens (só quantidades).
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';

export type ModuleRow = { id: string; title: string; position: number };
export type LessonRow = { id: string; title: string; module_id: string; position: number };
export type ViewRow = { lesson_id: string; user_id: string };
export type CompletionRow = { lesson_id: string };
export type AccessRow = { user_id: string; accessed_at: string; unenrolled_at: string | null };

export type LessonStat = {
  lessonId: string;
  title: string;
  moduleTitle: string;
  views: number;
  uniqueViewers: number;
  completions: number;
};

export type ModuleStat = {
  moduleId: string;
  title: string;
  views: number;
  completions: number;
  lessonCount: number;
};

export type Finisher = { userId: string; name: string; completedAt: string };

export type CourseDetailInput = {
  modules: ModuleRow[];
  lessons: LessonRow[];
  views: ViewRow[];
  completions: CompletionRow[];
  accesses: AccessRow[];
  courseCompletionsCount: number;
};

export type CourseStatsDetail = {
  totals: {
    enrolls: number;
    completions: number;
    accesses: number;
    uniqueUsers: number;
  };
  /** Módulos ordenados por visitas desc (título desempata). */
  modules: ModuleStat[];
  /** Aulas ordenadas por visitas desc (título desempata). */
  lessons: LessonStat[];
};

/** Função pura: dá os números por módulo/aula + totais. Sem I/O. */
export function aggregateCourseDetail(input: CourseDetailInput): CourseStatsDetail {
  const { modules, lessons, views, completions, accesses, courseCompletionsCount } = input;

  const moduleById = new Map(modules.map((m) => [m.id, m]));

  // Por aula: visitas, visitantes únicos, conclusões.
  type LAcc = { views: number; viewers: Set<string>; completions: number };
  const lessonAcc = new Map<string, LAcc>();
  for (const l of lessons) {
    lessonAcc.set(l.id, { views: 0, viewers: new Set(), completions: 0 });
  }
  for (const v of views) {
    const a = lessonAcc.get(v.lesson_id);
    if (!a) continue;
    a.views += 1;
    a.viewers.add(v.user_id);
  }
  for (const c of completions) {
    const a = lessonAcc.get(c.lesson_id);
    if (a) a.completions += 1;
  }

  const lessonStats: LessonStat[] = lessons
    .map((l) => {
      const a = lessonAcc.get(l.id)!;
      return {
        lessonId: l.id,
        title: l.title,
        moduleTitle: moduleById.get(l.module_id)?.title ?? '—',
        views: a.views,
        uniqueViewers: a.viewers.size,
        completions: a.completions,
      };
    })
    .sort((x, y) => y.views - x.views || x.title.localeCompare(y.title, 'pt'));

  // Por módulo: soma das suas aulas.
  const moduleStats: ModuleStat[] = modules
    .map((m) => {
      const own = lessons.filter((l) => l.module_id === m.id);
      let views = 0;
      let comps = 0;
      for (const l of own) {
        const a = lessonAcc.get(l.id)!;
        views += a.views;
        comps += a.completions;
      }
      return {
        moduleId: m.id,
        title: m.title,
        views,
        completions: comps,
        lessonCount: own.length,
      };
    })
    .sort((x, y) => y.views - x.views || x.title.localeCompare(y.title, 'pt'));

  // Inscrições activas: row mais recente por user com unenrolled_at NULL.
  const latestByUser = new Map<string, { accessed_at: string; unenrolled_at: string | null }>();
  const uniqueUsers = new Set<string>();
  for (const a of accesses) {
    uniqueUsers.add(a.user_id);
    const prev = latestByUser.get(a.user_id);
    if (!prev || a.accessed_at > prev.accessed_at) {
      latestByUser.set(a.user_id, { accessed_at: a.accessed_at, unenrolled_at: a.unenrolled_at });
    }
  }
  let enrolls = 0;
  for (const latest of latestByUser.values()) {
    if (latest.unenrolled_at === null) enrolls += 1;
  }

  return {
    totals: {
      enrolls,
      completions: courseCompletionsCount,
      accesses: accesses.length,
      uniqueUsers: uniqueUsers.size,
    },
    modules: moduleStats,
    lessons: lessonStats,
  };
}

/**
 * Constrói a lista "quem terminou" com nomes. **Gate de papel**: devolve `null`
 * se o caller não for super_admin (nomes são PII; só super_admin lê `profiles`).
 * Pura para ser testável isoladamente.
 */
export function buildFinishers(
  isSuper: boolean,
  courseCompletions: { user_id: string; completed_at: string }[],
  nameById: Map<string, string>,
): Finisher[] | null {
  if (!isSuper) return null;
  return courseCompletions
    .map((c) => ({
      userId: c.user_id,
      name: nameById.get(c.user_id) ?? 'Utilizador removido',
      completedAt: c.completed_at,
    }))
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export type CourseStatsDetailResult = {
  title: string;
  published: boolean;
  detail: CourseStatsDetail;
  /** Nomes de quem terminou — só super_admin; `null` para admin normal. */
  finishers: Finisher[] | null;
};

/** Carrega o detalhe de um curso para o admin. Devolve `null` se não existir. */
export async function getCourseStatsDetail(
  courseId: string,
): Promise<CourseStatsDetailResult | null> {
  const caller = await getCurrentUser();
  if (!caller || !UUID_RE.test(courseId)) return null;

  const supabase = await getServerClient();

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id, title, published_at')
    .eq('id', courseId)
    .maybeSingle<{ id: string; title: string; published_at: string | null }>();

  if (courseError) throw new Error(`Falha a carregar curso: ${courseError.message}`);
  if (!course) return null;

  const { data: modules, error: modulesError } = await supabase
    .from('modules')
    .select('id, title, position')
    .eq('course_id', courseId)
    .returns<ModuleRow[]>();
  if (modulesError) throw new Error(`Falha a carregar módulos: ${modulesError.message}`);

  const moduleIds = (modules ?? []).map((m) => m.id);
  let lessons: LessonRow[] = [];
  if (moduleIds.length > 0) {
    const { data, error } = await supabase
      .from('lessons')
      .select('id, title, module_id, position')
      .in('module_id', moduleIds)
      .returns<LessonRow[]>();
    if (error) throw new Error(`Falha a carregar aulas: ${error.message}`);
    lessons = data ?? [];
  }
  const lessonIds = lessons.map((l) => l.id);

  // Visitas e conclusões só fazem sentido com aulas.
  const [viewsRes, complRes, accessRes, courseComplRes] = await Promise.all([
    lessonIds.length > 0
      ? supabase
          .from('lesson_views')
          .select('lesson_id, user_id')
          .in('lesson_id', lessonIds)
          .returns<ViewRow[]>()
      : Promise.resolve({ data: [] as ViewRow[], error: null }),
    lessonIds.length > 0
      ? supabase
          .from('lesson_completions')
          .select('lesson_id')
          .in('lesson_id', lessonIds)
          .returns<CompletionRow[]>()
      : Promise.resolve({ data: [] as CompletionRow[], error: null }),
    supabase
      .from('course_access_log')
      .select('user_id, accessed_at, unenrolled_at')
      .eq('course_id', courseId)
      .returns<AccessRow[]>(),
    supabase
      .from('course_completions')
      .select('user_id, completed_at')
      .eq('course_id', courseId)
      .returns<{ user_id: string; completed_at: string }[]>(),
  ]);

  const firstError = viewsRes.error ?? complRes.error ?? accessRes.error ?? courseComplRes.error;
  if (firstError) throw new Error(`Falha a carregar estatísticas: ${firstError.message}`);

  const courseCompletions = courseComplRes.data ?? [];
  const detail = aggregateCourseDetail({
    modules: modules ?? [],
    lessons,
    views: viewsRes.data ?? [],
    completions: complRes.data ?? [],
    accesses: accessRes.data ?? [],
    courseCompletionsCount: courseCompletions.length,
  });

  // Quem terminou — nomes só para super_admin (PII; RLS de profiles).
  const isSuper = isSuperAdmin(caller.role);
  let nameById = new Map<string, string>();
  if (isSuper && courseCompletions.length > 0) {
    const userIds = courseCompletions.map((c) => c.user_id);
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', userIds)
      .returns<{ id: string; display_name: string }[]>();
    if (profilesError) throw new Error(`Falha a carregar perfis: ${profilesError.message}`);
    nameById = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
  }
  const finishers = buildFinishers(isSuper, courseCompletions, nameById);

  return { title: course.title, published: course.published_at !== null, detail, finishers };
}
