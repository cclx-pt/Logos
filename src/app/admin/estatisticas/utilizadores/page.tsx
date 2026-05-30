import { notFound } from 'next/navigation';
import Link from 'next/link';

import { ListSearch } from '@/components/admin/list-search';
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
        <ListSearch label="Pesquisar utilizador" placeholder="Pesquisar por nome ou papel...">
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Utilizador
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Papel
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Inscritos
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Terminados
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((row) => (
                  <tr
                    key={row.userId}
                    data-search-text={`${row.name.toLowerCase()} ${ROLE_LABEL[row.role].toLowerCase()}`}
                    className="text-ink hover:bg-muted/40 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/estatisticas/utilizadores/${row.userId}`}
                        className="hover:text-orange-hover focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="text-muted-foreground px-4 py-3">{ROLE_LABEL[row.role]}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.enrolled}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{row.completed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ListSearch>
      )}
    </div>
  );
}
