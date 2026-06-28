import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser, ROLE_LABEL } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/auth/guards';
import { getUserStatsDetail } from '@/lib/courses/stats-users';
import { formatDate } from '@/lib/format';

export const metadata = {
  title: 'Utilizador · Estatísticas · Área admin · LOGOS',
};

export default async function UserStatsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller.role)) {
    notFound();
  }

  const { id } = await params;
  const detail = await getUserStatsDetail(id);
  if (!detail) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center gap-2 text-xs"
      >
        <Link href="/admin/estatisticas" className="hover:text-ink transition-colors">
          Estatísticas
        </Link>
        <span aria-hidden="true">›</span>
        <Link href="/admin/estatisticas/utilizadores" className="hover:text-ink transition-colors">
          Por utilizador
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink line-clamp-1">{detail.name}</span>
      </nav>

      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">{detail.name}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{ROLE_LABEL[detail.role]}</p>
      </header>

      <section aria-label="Cursos inscritos" className="space-y-3">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">
          Inscrito em ({detail.enrolled.length})
        </h2>
        {detail.enrolled.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sem inscrições activas.</p>
        ) : (
          <ul className="divide-border border-border divide-y overflow-hidden rounded-lg border">
            {detail.enrolled.map((c) => (
              <li key={c.courseId}>
                <Link
                  href={`/admin/estatisticas/cursos/${c.courseId}`}
                  className="text-ink hover:bg-muted/40 focus-visible:ring-ring block px-4 py-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-label="Cursos terminados" className="space-y-3">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">
          Terminou ({detail.completed.length})
        </h2>
        {detail.completed.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ainda não terminou nenhum curso.</p>
        ) : (
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Curso
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Concluído em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {detail.completed.map((c) => (
                  <tr key={c.courseId} className="text-ink">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/estatisticas/cursos/${c.courseId}`}
                        className="hover:text-orange-hover focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {c.title}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-4 py-3 text-right">
                      {formatDate(c.completedAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
