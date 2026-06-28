import type { Metadata } from 'next';

import { getCurrentUser } from '@/lib/auth';
import { getStartedCoursesForUser } from '@/lib/courses/started';
import { MeusCursosContent } from './meus-cursos-content';

export const metadata: Metadata = {
  title: 'Os meus cursos',
  description: 'Os cursos do LOGOS que começaste, ordenados pelo mais recente.',
};

export default async function MeusCursosPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <MeusCursosContent isAuthenticated={false} courses={[]} />;
  }
  const courses = await getStartedCoursesForUser();
  return <MeusCursosContent isAuthenticated={true} courses={courses} />;
}
