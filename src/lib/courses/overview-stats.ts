/**
 * Visão geral agregada de utilização para o admin (V3 — estatísticas básicas).
 *
 * Junta num só sítio os números leves que já existem por curso:
 * acessos, utilizadores activos, aulas/cursos concluídos. NÃO calcula taxas
 * de conclusão (%), segmentação por etiqueta nem tendências no tempo — isso é
 * o "dashboard de estatísticas mais profundo" de V5 (SPEC_1.md §9) e fica
 * deliberadamente de fora.
 *
 * RLS: todas as tabelas lidas aqui dão SELECT a admin/super_admin
 * (course_access_log → só admin; lesson/course_completions → own_or_admin;
 * courses/modules/lessons → admin vê tudo). "Utilizadores activos" usa
 * `course_access_log` (e não `profiles`, cujo SELECT é só super_admin) — além
 * de ser admin-safe, mede engagement melhor que "registados".
 *
 * Escala: um SELECT por tabela + agregação em JS. Suficiente para os volumes
 * de V3 (poucos cursos, log modesto). Quando crescer, mover para uma RPC /
 * view materializada em V5.
 */

import { getServerClient } from '@/lib/auth';

export type CourseInput = { id: string; title: string; published_at: string | null };
export type ModuleInput = { id: string; course_id: string };
export type LessonInput = { id: string; module_id: string };
export type AccessInput = { course_id: string; user_id: string };
export type LessonCompletionInput = { lesson_id: string };
export type CourseCompletionInput = { course_id: string };

export type OverviewInput = {
  courses: CourseInput[];
  modules: ModuleInput[];
  lessons: LessonInput[];
  accesses: AccessInput[];
  lessonCompletions: LessonCompletionInput[];
  courseCompletions: CourseCompletionInput[];
};

export type CourseOverviewRow = {
  courseId: string;
  title: string;
  published: boolean;
  accesses: number;
  uniqueUsers: number;
  lessonCompletions: number;
};

export type AdminOverview = {
  totals: {
    coursesPublished: number;
    coursesDraft: number;
    totalAccesses: number;
    activeUsers: number;
    lessonCompletions: number;
    courseCompletions: number;
  };
  perCourse: CourseOverviewRow[];
};

/**
 * Função pura: transforma as linhas cruas das 6 tabelas no resumo agregado.
 * Sem I/O — testável isoladamente.
 */
export function aggregateOverview(input: OverviewInput): AdminOverview {
  const { courses, modules, lessons, accesses, lessonCompletions, courseCompletions } = input;

  // lesson → course (via module) para imputar conclusões de aulas ao curso.
  const courseByModule = new Map(modules.map((m) => [m.id, m.course_id]));
  const courseByLesson = new Map<string, string>();
  for (const lesson of lessons) {
    const courseId = courseByModule.get(lesson.module_id);
    if (courseId) courseByLesson.set(lesson.id, courseId);
  }

  // Acumuladores por curso, semeados com todos os cursos (zeros incluídos).
  type Acc = { accesses: number; users: Set<string>; lessonCompletions: number };
  const acc = new Map<string, Acc>();
  for (const c of courses) {
    acc.set(c.id, { accesses: 0, users: new Set(), lessonCompletions: 0 });
  }

  const activeUsers = new Set<string>();
  for (const a of accesses) {
    activeUsers.add(a.user_id);
    const row = acc.get(a.course_id);
    if (!row) continue; // acesso a curso entretanto apagado — ignora
    row.accesses += 1;
    row.users.add(a.user_id);
  }

  for (const lc of lessonCompletions) {
    const courseId = courseByLesson.get(lc.lesson_id);
    if (!courseId) continue;
    const row = acc.get(courseId);
    if (row) row.lessonCompletions += 1;
  }

  const perCourse: CourseOverviewRow[] = courses
    .map((c) => {
      const row = acc.get(c.id)!;
      return {
        courseId: c.id,
        title: c.title,
        published: c.published_at !== null,
        accesses: row.accesses,
        uniqueUsers: row.users.size,
        lessonCompletions: row.lessonCompletions,
      };
    })
    // Mais utilizados primeiro; empate desfeito por título (pt) para ser estável.
    .sort((a, b) => b.accesses - a.accesses || a.title.localeCompare(b.title, 'pt'));

  return {
    totals: {
      coursesPublished: courses.filter((c) => c.published_at !== null).length,
      coursesDraft: courses.filter((c) => c.published_at === null).length,
      totalAccesses: accesses.length,
      activeUsers: activeUsers.size,
      lessonCompletions: lessonCompletions.length,
      courseCompletions: courseCompletions.length,
    },
    perCourse,
  };
}

/**
 * Lê as 6 tabelas e devolve o resumo agregado. Chamada por
 * `/admin/estatisticas` (que já está protegida por role no layout admin).
 */
export async function getAdminOverview(): Promise<AdminOverview> {
  const supabase = await getServerClient();

  const [
    { data: courses, error: coursesError },
    { data: modules, error: modulesError },
    { data: lessons, error: lessonsError },
    { data: accesses, error: accessesError },
    { data: lessonCompletions, error: lessonComplError },
    { data: courseCompletions, error: courseComplError },
  ] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, published_at')
      .order('title', { ascending: true })
      .returns<CourseInput[]>(),
    supabase.from('modules').select('id, course_id').returns<ModuleInput[]>(),
    supabase.from('lessons').select('id, module_id').returns<LessonInput[]>(),
    supabase.from('course_access_log').select('course_id, user_id').returns<AccessInput[]>(),
    supabase.from('lesson_completions').select('lesson_id').returns<LessonCompletionInput[]>(),
    supabase.from('course_completions').select('course_id').returns<CourseCompletionInput[]>(),
  ]);

  const firstError =
    coursesError ??
    modulesError ??
    lessonsError ??
    accessesError ??
    lessonComplError ??
    courseComplError;
  if (firstError) {
    throw new Error(`Falha a carregar estatísticas: ${firstError.message}`);
  }

  return aggregateOverview({
    courses: courses ?? [],
    modules: modules ?? [],
    lessons: lessons ?? [],
    accesses: accesses ?? [],
    lessonCompletions: lessonCompletions ?? [],
    courseCompletions: courseCompletions ?? [],
  });
}
