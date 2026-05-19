/**
 * Helper canónico de visibilidade de cursos para o catálogo público.
 *
 * **Quem filtra o quê:**
 *   - **RLS** em `courses` (criada na PR2 via `course_is_visible(courses)`)
 *     decide quem vê o quê: admin/super_admin vêem tudo; user normal só vê
 *     `published_at IS NOT NULL` E (`required_tags = '{}'` OU
 *     `current_profile_has_tag(required_tags)`). Esta função delega
 *     totalmente nessa policy — não duplica a regra cá.
 *   - Esta função **agrega**: nome, descrição, ícone, e flag `hasLessons`
 *     usada para o badge "Em breve" nos cards.
 *   - Pesquisa textual opcional (`query`) aplica `ILIKE %q%` no título,
 *     case-insensitive. Wildcards (`%`, `_`) são interpretados como
 *     pattern matching — comportamento intencional para flexibilidade.
 *
 * Mantém-se em `src/lib/courses/` (não em `src/app/conteudos/`) porque a
 * função vai ser reutilizada pela página de curso (PR6) e potencialmente
 * por uma futura página "Os meus cursos".
 */

import { getServerClient } from '@/lib/auth';

export type VisibleCourse = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  /** `true` se o curso tem pelo menos uma aula. Usado para o badge "Em breve". */
  hasLessons: boolean;
};

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
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
    .select('id, slug, title, description, icon, modules ( lessons ( count ) )')
    .order('title', { ascending: true });

  if (trimmedQuery.length > 0) {
    request = request.ilike('title', `%${trimmedQuery}%`);
  }

  const { data, error } = await request.returns<CourseRow[]>();

  if (error) {
    throw new Error(`Falha a carregar cursos: ${error.message}`);
  }

  const rows = data ?? [];
  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    icon: row.icon,
    hasLessons: (row.modules ?? []).some((m) => (m.lessons?.[0]?.count ?? 0) > 0),
  }));
}
