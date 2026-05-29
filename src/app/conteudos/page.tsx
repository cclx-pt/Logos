import type { Metadata } from 'next';

import { getCurrentUser } from '@/lib/auth';
import { getVisibleCoursesForUser } from '@/lib/courses/visibility';
import { ConteudosContent } from './conteudos-content';

export const metadata: Metadata = {
  title: 'Conteúdos',
  description:
    'Catálogo de estudo Bíblico da CCLX. Cursos em vídeo com apostilas para descarregar, sempre gratuitos.',
};

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ConteudosPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const trimmedQuery = q?.trim() ?? '';
  const [courses, user] = await Promise.all([
    getVisibleCoursesForUser({ query: trimmedQuery }),
    getCurrentUser(),
  ]);
  return (
    <ConteudosContent
      courses={courses}
      query={trimmedQuery}
      isAuthenticated={user !== null}
    />
  );
}
