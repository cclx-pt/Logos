import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Award, BarChart3, BookOpen, CheckCircle2, UserCheck, Users } from 'lucide-react';

import { getCurrentUser } from '@/lib/auth';
import { isAdmin, isSuperAdmin } from '@/lib/auth/guards';
import { getAdminOverview } from '@/lib/courses/overview-stats';
import { StatCard } from '@/components/admin/stat-card';

export const metadata = {
  title: 'Estatísticas · Área admin · LOGOS',
};

export default async function EstatisticasPage() {
  const user = await getCurrentUser();
  // Layout já faz o gating; repetimos por defesa em profundidade.
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const { totals, perCourse } = await getAdminOverview();
  const draftHint =
    totals.coursesDraft === 1 ? '1 em rascunho' : `${totals.coursesDraft} em rascunho`;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
            Estatísticas
          </h1>
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Visão geral da utilização do LOGOS. Os acessos são registados quando alguém clica em{' '}
            <strong>Começar</strong> ou <strong>Continuar curso</strong>; as conclusões vêm das
            aulas marcadas pelos utilizadores. Abre um curso para o detalhe por módulo e aula.
          </p>
        </div>
        {isSuperAdmin(user.role) && (
          <Link
            href="/admin/estatisticas/utilizadores"
            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 shrink-0 items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Ver por utilizador →
          </Link>
        )}
      </header>

      <section aria-label="Totais" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<BookOpen className="h-5 w-5" />}
          label="Cursos publicados"
          value={totals.coursesPublished}
          hint={draftHint}
        />
        <StatCard
          icon={<BarChart3 className="h-5 w-5" />}
          label="Acessos totais"
          value={totals.totalAccesses}
          hint="Cada clique no CTA conta — o mesmo utilizador pode contar várias vezes."
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="Utilizadores registados"
          value={totals.registeredUsers ?? '—'}
          hint="Total de contas (login Google)."
        />
        <StatCard
          icon={<UserCheck className="h-5 w-5" />}
          label="Utilizadores activos"
          value={totals.activeUsers}
          hint="Pessoas distintas que abriram pelo menos um curso."
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Aulas concluídas"
          value={totals.lessonCompletions}
          hint="Marcações activas; desmarcar uma aula reduz o número."
        />
        <StatCard
          icon={<Award className="h-5 w-5" />}
          label="Cursos concluídos"
          value={totals.courseCompletions}
          hint="Utilizadores que concluíram todas as aulas de um curso."
        />
      </section>

      <section aria-label="Resumo por curso" className="space-y-3">
        <h2 className="text-ink text-sm font-semibold tracking-wide uppercase">Por curso</h2>
        {perCourse.length === 0 ? (
          <p className="text-muted-foreground text-sm">Ainda não há dados de utilização.</p>
        ) : (
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Curso
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Estado
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Inscritos
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Acessos
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Únicos
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Finalizações
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Aulas concl.
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {perCourse.map((row) => (
                  <tr key={row.courseId} className="text-ink hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/estatisticas/cursos/${row.courseId}`}
                        className="hover:text-orange-hover focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {row.title}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">
                      {row.published ? 'Publicado' : 'Rascunho'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.enrolls}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.accesses}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.uniqueUsers}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.completions}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.lessonCompletions}</td>
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
