import type { Metadata } from 'next';

import { getVisibleCoursesForUser } from '@/lib/courses/visibility';
import { getCourseProgressForUser } from '@/lib/courses/progress';
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
  const courses = await getVisibleCoursesForUser({ query: trimmedQuery });
  // Enriquecer com progresso: anónimos recebem {} → defaults a false/false
  // nos badges (V3.1 T6). Helper já trata do caso "sem sessão" devolvendo {}.
  const progress = await getCourseProgressForUser(courses.map((c) => c.id));
  const coursesWithProgress = courses.map((c) => ({
    ...c,
    started: progress[c.id]?.started ?? false,
    completed: progress[c.id]?.completed ?? false,
  }));
  return <ConteudosContent courses={coursesWithProgress} query={trimmedQuery} />;
}
