/**
 * Ordenação do catálogo `/conteudos` (V3.3 PR8).
 *
 * 4 chaves suportadas:
 *   - `por-comecar` — não-começados → em-curso → concluídos (default auth)
 *   - `concluidos` — concluídos → em-curso → não-começados
 *   - `a-z` — alfabética asc (default anon)
 *   - `z-a` — alfabética desc
 *
 * Para anon, as chaves `por-comecar` / `concluidos` caem para `a-z`
 * (anon não tem estado pessoal). O caller (page.tsx) decide o default
 * baseado em `isAuthenticated`.
 */

import type { VisibleCourse } from './visibility';

export type SortKey = 'por-comecar' | 'concluidos' | 'a-z' | 'z-a';

const ALL_SORT_KEYS: SortKey[] = ['por-comecar', 'concluidos', 'a-z', 'z-a'];

export function isSortKey(value: unknown): value is SortKey {
  return typeof value === 'string' && (ALL_SORT_KEYS as string[]).includes(value);
}

/**
 * Default smart por estado de auth. Logado privilegia "por começar" para
 * empurrar progresso novo para o topo; anon vai a alfabética.
 */
export function defaultSortKey(isAuthenticated: boolean): SortKey {
  return isAuthenticated ? 'por-comecar' : 'a-z';
}

type StatusGroup = 'not-started' | 'in-progress' | 'completed';

function statusGroup(
  courseId: string,
  enrolledSet: Set<string>,
  completedSet: Set<string>,
): StatusGroup {
  if (completedSet.has(courseId)) return 'completed';
  if (enrolledSet.has(courseId)) return 'in-progress';
  return 'not-started';
}

const POR_COMECAR_ORDER: Record<StatusGroup, number> = {
  'not-started': 0,
  'in-progress': 1,
  completed: 2,
};

const CONCLUIDOS_ORDER: Record<StatusGroup, number> = {
  completed: 0,
  'in-progress': 1,
  'not-started': 2,
};

export function sortCourses(
  courses: VisibleCourse[],
  sortKey: SortKey,
  isAuthenticated: boolean,
  enrolledSet: Set<string>,
  completedSet: Set<string>,
): VisibleCourse[] {
  const sorted = [...courses];

  if (sortKey === 'a-z') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
    return sorted;
  }
  if (sortKey === 'z-a') {
    sorted.sort((a, b) => b.title.localeCompare(a.title, 'pt'));
    return sorted;
  }

  // por-comecar / concluidos — anon não tem estado, cai para a-z.
  if (!isAuthenticated) {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'pt'));
    return sorted;
  }

  const order = sortKey === 'concluidos' ? CONCLUIDOS_ORDER : POR_COMECAR_ORDER;
  sorted.sort((a, b) => {
    const ga = order[statusGroup(a.id, enrolledSet, completedSet)];
    const gb = order[statusGroup(b.id, enrolledSet, completedSet)];
    if (ga !== gb) return ga - gb;
    return a.title.localeCompare(b.title, 'pt');
  });
  return sorted;
}
