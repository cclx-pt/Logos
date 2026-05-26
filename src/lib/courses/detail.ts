/**
 * Helpers de detalhe de curso/aula para `/conteudos/[courseId]` e
 * `/conteudos/[courseId]/[lessonId]`. RLS filtra visibilidade (helper SQL
 * `course_is_visible(courses)` herdado em modules/lessons via subquery),
 * por isso estes helpers apenas agregam o resultado.
 */

import { getServerClient } from '@/lib/auth';

import { getBannerUrlForPath } from './banner';

export type LessonSummary = {
  id: string;
  title: string;
  description: string | null;
  template: 'pdf' | 'video_pdf';
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
  modules: ModuleWithLessons[];
};

type CourseDetailRow = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  banner_storage_path: string | null;
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
      'id, title, description, icon, banner_storage_path, modules ( id, title, description, position, lessons ( id, title, description, template, position ) )',
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

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    icon: data.icon,
    bannerUrl,
    modules,
  };
}

export type LessonDetail = {
  id: string;
  title: string;
  description: string | null;
  template: 'pdf' | 'video_pdf';
  youtube_url: string | null;
  pdf_storage_path: string;
  position: number;
  module: { id: string; title: string; position: number };
  course: { id: string; title: string; icon: string | null };
};

type LessonRow = {
  id: string;
  title: string;
  description: string | null;
  template: 'pdf' | 'video_pdf';
  youtube_url: string | null;
  pdf_storage_path: string;
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
 * Devolve a primeira aula do curso (ordem natural por módulos/posições).
 * Usado pelo botão "Começar curso" / "Continuar curso" em PR6. Em PR7
 * passa a "primeira aula incompleta" — assinatura fica preparada.
 */
export function getFirstLessonOfCourse(course: CourseDetail): { id: string } | null {
  for (const m of course.modules) {
    if (m.lessons.length > 0) return { id: m.lessons[0]!.id };
  }
  return null;
}
