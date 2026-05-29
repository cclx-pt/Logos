import type { Metadata } from 'next';

import { getCurrentUser } from '@/lib/auth';
import { getCompletedCourseIdsForCurrentUser } from '@/lib/courses/completion';
import { getEnrolledCourseIdsForCurrentUser } from '@/lib/courses/enrollment';
import { defaultSortKey, isSortKey, sortCourses } from '@/lib/courses/sort';
import { getVisibleCoursesForUser } from '@/lib/courses/visibility';
import { ConteudosContent } from './conteudos-content';

export const metadata: Metadata = {
  title: 'Conteúdos',
  description:
    'Catálogo de estudo Bíblico da CCLX. Cursos em vídeo com apostilas para descarregar, sempre gratuitos.',
};

type PageProps = {
  searchParams: Promise<{ q?: string; ordenar?: string }>;
};

export default async function ConteudosPage({ searchParams }: PageProps) {
  const { q, ordenar } = await searchParams;
  const trimmedQuery = q?.trim() ?? '';

  const [courses, user, completedCourseIds, enrolledCourseIds] = await Promise.all([
    getVisibleCoursesForUser({ query: trimmedQuery }),
    getCurrentUser(),
    // RLS devolve set vazio para anon, sem query — não é preciso gate explícito.
    getCompletedCourseIdsForCurrentUser(),
    getEnrolledCourseIdsForCurrentUser(),
  ]);

  const isAuthenticated = user !== null;
  const sortKey = isSortKey(ordenar) ? ordenar : defaultSortKey(isAuthenticated);

  const sortedCourses = sortCourses(
    courses,
    sortKey,
    isAuthenticated,
    enrolledCourseIds,
    completedCourseIds,
  );

  return (
    <ConteudosContent
      courses={sortedCourses}
      query={trimmedQuery}
      isAuthenticated={isAuthenticated}
      completedCourseIds={Array.from(completedCourseIds)}
      sortKey={sortKey}
    />
  );
}
