import { notFound } from 'next/navigation';
import Link from 'next/link';

import { SortableStatsTable } from '@/components/admin/sortable-stats-table';
import { getCurrentUser, ROLE_LABEL } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/auth/guards';
import { getUsersOverview } from '@/lib/courses/stats-users';

export const metadata = {
  title: 'Estatísticas por utilizador · Área admin · LOGOS',
};

export default async function UsersStatsPage() {
  const user = await getCurrentUser();
  // Dados por utilizador são PII → só super_admin (alinhado com o RLS de profiles).
  if (!user || !isSuperAdmin(user.role)) {
    notFound();
  }

  const rows = (await getUsersOverview()) ?? [];

  return (
    <div className="space-y-6">
      <nav
        aria-label="Breadcrumb"
        className="text-muted-foreground flex items-center gap-2 text-xs"
      >
        <Link href="/admin/estatisticas" className="hover:text-ink transition-colors">
          Estatísticas
        </Link>
        <span aria-hidden="true">›</span>
        <span className="text-ink">Por utilizador</span>
      </nav>

      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
          Por utilizador
        </h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Cursos em que cada utilizador está inscrito e quantos terminou. Abre um utilizador para
          ver os cursos.
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted-foreground text-sm">Ainda não há utilizadores.</p>
      ) : (
        <SortableStatsTable
          searchLabel="Pesquisar utilizador"
          searchPlaceholder="Pesquisar por nome ou papel..."
          columns={[
            { key: 'name', label: 'Utilizador' },
            { key: 'role', label: 'Papel' },
            { key: 'enrolled', label: 'Inscritos', numeric: true },
            { key: 'completed', label: 'Terminados', numeric: true },
          ]}
          rows={rows.map((row) => ({
            id: row.userId,
            href: `/admin/estatisticas/utilizadores/${row.userId}`,
            search: `${row.name.toLowerCase()} ${ROLE_LABEL[row.role].toLowerCase()}`,
            cells: {
              name: row.name,
              role: ROLE_LABEL[row.role],
              enrolled: row.enrolled,
              completed: row.completed,
            },
          }))}
        />
      )}
    </div>
  );
}
