import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Award, BarChart3, UserCheck, Users } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { getCourseStatsDetail } from '@/lib/courses/stats-detail';
import { StatCard } from '@/components/admin/stat-card';
import { SortableStatsTable } from '@/components/admin/sortable-stats-table';
import { formatDate } from '@/lib/format';

export const metadata = {
  title: 'Estatísticas do curso · Área admin · LOGOS',
};

export default async function CourseStatsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const { courseId } = await params;
  const result = await getCourseStatsDetail(courseId);
  if (!result) {
    notFound();
  }

  const { title, published, detail, finishers } = result;

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
        <span className="text-ink line-clamp-1">{title}</span>
      </nav>

      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">{title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{published ? 'Publicado' : 'Rascunho'}</p>
      </header>

      <section aria-label="Totais do curso" className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Inscritos"
          value={detail.totals.enrolls}
          hint="Inscrições activas (quem não saiu do curso)."
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Finalizações"
          value={detail.totals.completions}
          hint="Pessoas que concluíram o curso inteiro."
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Acessos"
          value={detail.totals.accesses}
          hint="Total de aberturas do curso."
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Únicos"
          value={detail.totals.uniqueUsers}
          hint="Pessoas distintas que abriram o curso."
        />
      </section>

      <section aria-label="Módulos" className="space-y-3">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">
          Módulos (mais visitados primeiro)
        </h2>
        {detail.modules.length === 0 ? (
          <p className="text-muted-foreground text-sm">Este curso ainda não tem módulos.</p>
        ) : (
          <SortableStatsTable
            initialSortKey="views"
            initialSortDir="desc"
            columns={[
              { key: 'title', label: 'Módulo' },
              { key: 'lessonCount', label: 'Aulas', numeric: true },
              { key: 'views', label: 'Visitas', numeric: true },
              { key: 'completions', label: 'Concluídas', numeric: true },
            ]}
            rows={detail.modules.map((m) => ({
              id: m.moduleId,
              search: m.title.toLowerCase(),
              cells: {
                title: m.title,
                lessonCount: m.lessonCount,
                views: m.views,
                completions: m.completions,
              },
            }))}
          />
        )}
      </section>

      <section aria-label="Aulas" className="space-y-3">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">
          Aulas (mais visitadas primeiro)
        </h2>
        {detail.lessons.length === 0 ? (
          <p className="text-muted-foreground text-sm">Este curso ainda não tem aulas.</p>
        ) : (
          <SortableStatsTable
            searchLabel="Pesquisar aula"
            searchPlaceholder="Pesquisar por aula ou módulo..."
            initialSortKey="views"
            initialSortDir="desc"
            columns={[
              { key: 'title', label: 'Aula' },
              { key: 'moduleTitle', label: 'Módulo' },
              { key: 'views', label: 'Visitas', numeric: true },
              { key: 'uniqueViewers', label: 'Únicos', numeric: true },
              { key: 'completions', label: 'Concluídas', numeric: true },
            ]}
            rows={detail.lessons.map((l) => ({
              id: l.lessonId,
              search: `${l.title.toLowerCase()} ${l.moduleTitle.toLowerCase()}`,
              cells: {
                title: l.title,
                moduleTitle: l.moduleTitle,
                views: l.views,
                uniqueViewers: l.uniqueViewers,
                completions: l.completions,
              },
            }))}
          />
        )}
      </section>

      <section aria-label="Quem terminou" className="space-y-3">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">Quem terminou</h2>
        {finishers === null ? (
          <p className="text-muted-foreground text-sm">
            {detail.totals.completions === 0
              ? 'Ainda ninguém concluiu este curso.'
              : `${detail.totals.completions} ${detail.totals.completions === 1 ? 'pessoa concluiu' : 'pessoas concluíram'} este curso. A lista com nomes está disponível a super administradores.`}
          </p>
        ) : finishers.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ainda ninguém concluiu este curso.</p>
        ) : (
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Utilizador
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Concluído em
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {finishers.map((f) => (
                  <tr key={f.userId} className="text-ink">
                    <td className="px-4 py-3 font-medium">{f.name}</td>
                    <td className="text-muted-foreground px-4 py-3 text-right">
                      {formatDate(f.completedAt)}
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
