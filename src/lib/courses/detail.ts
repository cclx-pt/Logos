/**
 * Helpers de detalhe de curso/aula para `/conteudos/[courseId]` e
 * `/conteudos/[courseId]/[lessonId]`. RLS filtra visibilidade (helper SQL
 * `course_is_visible(courses)` herdado em modules/lessons via subquery),
 * por isso estes helpers apenas agregam o resultado.
 */

import { getServerClient } from '@/lib/auth';

import { getBannerUrlForPath } from './banner';

export type LessonTemplate = 'pdf' | 'video' | 'video_pdf';

export type LessonSummary = {
  id: string;
  title: string;
  description: string | null;
  template: LessonTemplate;
  position: number;
};

export type ModuleWithLessons = {
  id: string;
  title: string;
  description: string | null;
  position: number;
  lessons: LessonSummary[];
};

export type CourseDetail = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  /** Signed URL do banner (V3.2 PR1). `null` se sem banner ou se signing falhou. */
  bannerUrl: string | null;
  /**
   * V3.6: quando `true`, as aulas têm de ser concluídas pela ordem dentro de
   * cada módulo. Consumido por `src/lib/courses/sequencing.ts`.
   */
  sequentialLessons: boolean;
  /**
   * V3.6: quando `true`, um módulo só abre depois de o anterior estar
   * totalmente concluído. Independente de `sequentialLessons`.
   */
  sequentialModules: boolean;
  /**
   * V3.6: curso que tem de estar concluído antes deste. `null` = autónomo.
   * Só é preenchido se o pré-requisito for visível ao utilizador (RLS); se
   * for invisível (draft/restrito), vem `null` e não bloqueia.
   */
  prerequisite: { id: string; title: string } | null;
  modules: ModuleWithLessons[];
};

type CourseDetailRow = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  banner_storage_path: string | null;
  sequential_lessons: boolean;
  sequential_modules: boolean;
  prerequisite_course_id: string | null;
  modules: ModuleWithLessons[] | null;
};

/**
 * Carrega um curso pelo id, com os seus módulos e aulas ordenados por
 * `position`. Devolve `null` se o id não existir OU se o curso não for
 * visível para o utilizador actual (RLS decide). Modules sem lessons
 * aparecem na lista; lessons vazias vêm como `[]`.
 */
export async function getCourseDetailById(courseId: string): Promise<CourseDetail | null> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('courses')
    .select(
      'id, title, description, icon, banner_storage_path, sequential_lessons, sequential_modules, prerequisite_course_id, modules ( id, title, description, position, lessons ( id, title, description, template, position ) )',
    )
    .eq('id', courseId)
    .maybeSingle<CourseDetailRow>();

  if (error) {
    throw new Error(`Falha a carregar curso: ${error.message}`);
  }
  if (!data) return null;

  // O embed nested do PostgREST pode não respeitar `order`; ordenamos cá.
  const modules = (data.modules ?? [])
    .map((m) => ({ ...m, lessons: [...(m.lessons ?? [])].sort((a, b) => a.position - b.position) }))
    .sort((a, b) => a.position - b.position);

  const bannerUrl = await getBannerUrlForPath(data.banner_storage_path);
  const prerequisite = await getPrerequisiteSummary(data.prerequisite_course_id);

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    icon: data.icon,
    bannerUrl,
    sequentialLessons: data.sequential_lessons,
    sequentialModules: data.sequential_modules,
    prerequisite,
    modules,
  };
}

/**
 * Carrega o resumo (id + título) do curso pré-requisito. Devolve `null` se
 * não houver pré-requisito ou se o curso não for visível ao utilizador
 * actual (RLS) — nesse caso não há bloqueio. Lookup leve e separado em vez
 * de embed self-referencial do PostgREST (mais robusto, opção aborrecida).
 */
async function getPrerequisiteSummary(
  prerequisiteCourseId: string | null,
): Promise<{ id: string; title: string } | null> {
  if (!prerequisiteCourseId) return null;
  const supabase = await getServerClient();
  const { data } = await supabase
    .from('courses')
    .select('id, title')
    .eq('id', prerequisiteCourseId)
    .maybeSingle<{ id: string; title: string }>();
  return data ?? null;
}

export type LessonDetail = {
  id: string;
  title: string;
  description: string | null;
  template: LessonTemplate;
  youtube_url: string | null;
  /** `null` quando template = video (aula sem apostila). */
  pdf_storage_path: string | null;
  position: number;
  module: { id: string; title: string; position: number };
  course: { id: string; title: string; icon: string | null };
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  template: LessonTemplate;
  youtube_url: string | null;
  pdf_storage_path: string | null;
  position: number;
  module: {
    id: string;
    title: string;
    position: number;
    course: { id: string; title: string; icon: string | null };
  } | null;
};

/**
 * Carrega uma aula pelo id, com o módulo e o curso embedded. Devolve
 * `null` se o id não existir, se a aula não for visível (RLS) ou se o
 * embed do módulo/curso vier vazio (corner case se row órfã).
 */
export async function getLessonDetailById(lessonId: string): Promise<LessonDetail | null> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('lessons')
    .select(
      'id, title, description, template, youtube_url, pdf_storage_path, position, module:modules!inner ( id, title, position, course:courses!inner ( id, title, icon ) )',
    )
    .eq('id', lessonId)
    .maybeSingle<LessonRow>();

  if (error) {
    throw new Error(`Falha a carregar aula: ${error.message}`);
  }
  if (!data || !data.module) return null;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    template: data.template,
    youtube_url: data.youtube_url,
    pdf_storage_path: data.pdf_storage_path,
    position: data.position,
    module: {
      id: data.module.id,
      title: data.module.title,
      position: data.module.position,
    },
    course: data.module.course,
  };
}

export type LessonNavigation = {
  previous: { id: string; title: string } | null;
  next: { id: string; title: string } | null;
};

/**
 * Calcula aula anterior / próxima dentro do curso, atravessando módulos.
 * Lista linearizada por (module.position, lesson.position). Devolve
 * `previous: null` se for a primeira do curso, `next: null` se for a
 * última.
 */
export function getLessonNavigation(
  course: CourseDetail,
  currentLessonId: string,
): LessonNavigation {
  const flat: { id: string; title: string }[] = [];
  for (const m of course.modules) {
    for (const l of m.lessons) {
      flat.push({ id: l.id, title: l.title });
    }
  }
  const idx = flat.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) return { previous: null, next: null };
  return {
    previous: idx > 0 ? flat[idx - 1]! : null,
    next: idx < flat.length - 1 ? flat[idx + 1]! : null,
  };
}

/**
 * Navegação entre aulas DENTRO de um único módulo. Ao contrário de
 * `getLessonNavigation` (que atravessa módulos), aqui a última aula do
 * módulo tem `next: null` e a primeira tem `previous: null`. A progressão
 * entre módulos é tratada à parte (banner "Módulo concluído → próximo
 * módulo" + a árvore de navegação da vista de aula).
 */
export function getModuleLessonNavigation(
  module: ModuleWithLessons,
  currentLessonId: string,
): LessonNavigation {
  const idx = module.lessons.findIndex((l) => l.id === currentLessonId);
  if (idx === -1) return { previous: null, next: null };
  const prev = idx > 0 ? module.lessons[idx - 1]! : null;
  const next = idx < module.lessons.length - 1 ? module.lessons[idx + 1]! : null;
  return {
    previous: prev ? { id: prev.id, title: prev.title } : null,
    next: next ? { id: next.id, title: next.title } : null,
  };
}
