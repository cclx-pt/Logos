/**
 * Helper canónico de visibilidade de cursos para o catálogo público.
 *
 * **Quem filtra o quê:**
 *   - **RLS** em `courses` (criada na PR2 via `course_is_visible(courses)`)
 *     decide quem vê o quê: admin/super_admin vêem tudo; user normal só vê
 *     `published_at IS NOT NULL` E (`required_tags = '{}'` OU
 *     `current_profile_has_tag(required_tags)`). Esta função delega
 *     totalmente nessa policy — não duplica a regra cá.
 *   - Esta função **agrega**: nome, descrição, ícone, banner (signed URL
 *     se existir — V3.2 PR1), e flag `hasLessons` usada para o badge
 *     "Em breve" nos cards.
 *   - Pesquisa textual opcional (`query`) aplica `ILIKE %q%` no título,
 *     case-insensitive. Wildcards (`%`, `_`) são interpretados como
 *     pattern matching — comportamento intencional para flexibilidade.
 *
 * Mantém-se em `src/lib/courses/` (não em `src/app/conteudos/`) porque a
 * função é reutilizada por outras rotas (página de curso, /meus-cursos).
 */

import { getServerClient } from '@/lib/auth';

import { getBannerUrlsByPath } from './banner';

export type VisibleCourse = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  /** Signed URL do banner (V3.2 PR1). `null` se curso não tem banner ou se o signing falhou. */
  bannerUrl: string | null;
  /** `true` se o curso tem pelo menos uma aula. Usado para o badge "Em breve". */
  hasLessons: boolean;
  /**
   * V3.6: curso pré-requisito (id + título), `null` se autónomo ou se o
   * pré-requisito não for visível ao utilizador (RLS). A página decide o
   * bloqueio cruzando com os cursos já concluídos.
   */
  prerequisite: { id: string; title: string } | null;
};

type CourseRow = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  banner_storage_path: string | null;
  prerequisite_course_id: string | null;
  modules: ModuleRow[] | null;
};

type ModuleRow = {
  lessons: { count: number }[] | null;
};

const QUERY_MAX_LENGTH = 80;

export type GetVisibleCoursesOptions = {
  /** Filtro textual aplicado ao título via `ILIKE %q%`. Trim + limite 80 chars. */
  query?: string;
};

export async function getVisibleCoursesForUser(
  options: GetVisibleCoursesOptions = {},
): Promise<VisibleCourse[]> {
  const supabase = await getServerClient();

  const trimmedQuery = options.query?.trim().slice(0, QUERY_MAX_LENGTH) ?? '';

  let request = supabase
    .from('courses')
    .select(
      'id, title, description, icon, banner_storage_path, prerequisite_course_id, modules ( lessons ( count ) )',
    )
    .order('title', { ascending: true });

  if (trimmedQuery.length > 0) {
    request = request.ilike('title', `%${trimmedQuery}%`);
  }

  const { data, error } = await request.returns<CourseRow[]>();

  if (error) {
    throw new Error(`Falha a carregar cursos: ${error.message}`);
  }

  const rows = data ?? [];
  const bannerPaths = rows
    .map((r) => r.banner_storage_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
  const bannerUrls = await getBannerUrlsByPath(bannerPaths);

  // Títulos dos pré-requisitos (V3.6). Lookup em lote sobre os ids distintos
  // referenciados. RLS filtra cursos invisíveis — esses ficam fora do Map e
  // o card não mostra bloqueio (não dá para bloquear por algo que o
  // utilizador não vê).
  const prerequisiteTitles = await getCourseTitlesByIds(
    rows.map((r) => r.prerequisite_course_id).filter((id): id is string => typeof id === 'string'),
  );

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    bannerUrl: row.banner_storage_path ? (bannerUrls.get(row.banner_storage_path) ?? null) : null,
    hasLessons: (row.modules ?? []).some((m) => (m.lessons?.[0]?.count ?? 0) > 0),
    prerequisite:
      row.prerequisite_course_id && prerequisiteTitles.has(row.prerequisite_course_id)
        ? {
            id: row.prerequisite_course_id,
            title: prerequisiteTitles.get(row.prerequisite_course_id)!,
          }
        : null,
  }));
}

/**
 * Devolve um Map id → título para os cursos dados, em lote. Ids invisíveis ao
 * utilizador (RLS) simplesmente não aparecem no Map. Set vazio → sem query.
 */
async function getCourseTitlesByIds(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id, title')
    .in('id', unique)
    .returns<{ id: string; title: string }[]>();

  if (error) {
    throw new Error(`Falha a carregar pré-requisitos: ${error.message}`);
  }
  return new Map((data ?? []).map((r) => [r.id, r.title]));
}
