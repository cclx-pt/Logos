import { notFound } from 'next/navigation';

import { getCurrentUser, getServerClient, type Role } from '@/lib/auth';
import { setUserRoleAction } from './actions';

export const metadata = {
  title: 'Utilizadores · Área admin · Logos',
};

type ProfileRow = {
  id: string;
  display_name: string;
  role: Role;
  created_at: string;
};

const ROLE_LABEL: Record<Role, string> = {
  user: 'Utilizador',
  admin: 'Administrador',
  super_admin: 'Super administrador',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function UtilizadoresPage() {
  const user = await getCurrentUser();
  // Acesso restrito a super_admin — admin não vê esta página.
  if (!user || user.role !== 'super_admin') {
    notFound();
  }

  const supabase = await getServerClient();
  const { data: rows, error } = await supabase
    .from('profiles')
    .select('id, display_name, role, created_at')
    .order('created_at', { ascending: false })
    .returns<ProfileRow[]>();

  if (error) {
    throw new Error(`Falha a carregar utilizadores: ${error.message}`);
  }

  const profiles = rows ?? [];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Utilizadores</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Aqui podes promover utilizadores a administrador e despromover administradores a
          utilizador. Os super administradores existentes não aparecem como editáveis — a sua
          mudança de papel é feita só via SQL.
        </p>
      </header>

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
            <tr>
              <th scope="col" className="px-4 py-2 font-medium">
                Nome
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Papel
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Criado em
              </th>
              <th scope="col" className="px-4 py-2 text-right font-medium">
                Ação
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {profiles.map((row) => {
              const isSelf = row.id === user.id;
              const isSuperAdmin = row.role === 'super_admin';
              const canMutate = !isSelf && !isSuperAdmin;
              const nextRole: 'user' | 'admin' = row.role === 'admin' ? 'user' : 'admin';
              const actionLabel =
                row.role === 'admin' ? 'Despromover a utilizador' : 'Promover a admin';

              return (
                <tr key={row.id} className="text-ink">
                  <td className="px-4 py-3 font-medium">{row.display_name}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[row.role]}</td>
                  <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    {canMutate ? (
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          await setUserRoleAction(formData);
                        }}
                      >
                        <input type="hidden" name="targetId" value={row.id} />
                        <input type="hidden" name="newRole" value={nextRole} />
                        <button
                          type="submit"
                          className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          {actionLabel}
                        </button>
                      </form>
                    ) : (
                      <span className="text-muted-foreground text-xs">{isSelf ? 'Tu' : '—'}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
