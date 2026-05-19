import { notFound } from 'next/navigation';
import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';
import { getCurrentUser, getServerClient, type Role } from '@/lib/auth';
import { setUserRoleAction } from './actions';
import { UserTagsCell } from './user-tags-cell';

export const metadata = {
  title: 'Utilizadores · Área admin · LOGOS',
};

type ProfileRow = {
  id: string;
  display_name: string;
  role: Role;
  created_at: string;
};

type TagRow = {
  id: string;
  label: string;
};

type UserTagRow = {
  user_id: string;
  tag_id: string;
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
  // Acesso para admin e super_admin. Promover/despromover continua restrito a
  // super_admin no Server Action; a UI condiciona o botão.
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    notFound();
  }

  const canMutateRoles = user.role === 'super_admin';

  const supabase = await getServerClient();
  const [
    { data: profilesData, error: profilesError },
    { data: tagsData, error: tagsError },
    { data: userTagsData, error: userTagsError },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, display_name, role, created_at')
      .order('created_at', { ascending: false })
      .returns<ProfileRow[]>(),
    supabase
      .from('tags')
      .select('id, label')
      .order('label', { ascending: true })
      .returns<TagRow[]>(),
    supabase.from('user_tags').select('user_id, tag_id').returns<UserTagRow[]>(),
  ]);

  if (profilesError) {
    throw new Error(`Falha a carregar utilizadores: ${profilesError.message}`);
  }
  if (tagsError) {
    throw new Error(`Falha a carregar etiquetas: ${tagsError.message}`);
  }
  if (userTagsError) {
    throw new Error(`Falha a carregar atribuições: ${userTagsError.message}`);
  }

  const profiles = profilesData ?? [];
  const tags = tagsData ?? [];
  const userTags = userTagsData ?? [];

  const tagsById = new Map(tags.map((t) => [t.id, t]));
  const tagsByUser = new Map<string, TagRow[]>();
  for (const ut of userTags) {
    const tag = tagsById.get(ut.tag_id);
    if (!tag) continue;
    const list = tagsByUser.get(ut.user_id) ?? [];
    list.push(tag);
    tagsByUser.set(ut.user_id, list);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Utilizadores</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          {canMutateRoles
            ? 'Aqui podes promover utilizadores a administrador, despromover administradores a utilizador, e atribuir etiquetas a qualquer utilizador. Os super administradores existentes não aparecem como editáveis; a sua mudança de papel é feita só via SQL.'
            : 'Aqui podes atribuir e remover etiquetas dos utilizadores. A mudança de papel é restrita a super administradores.'}
        </p>
        {tags.length === 0 && (
          <p className="text-muted-foreground mt-2 max-w-prose text-sm">
            Ainda não há etiquetas criadas.{' '}
            {canMutateRoles ? (
              <Link href="/admin/etiquetas" className="text-orange-primary hover:underline">
                Criar uma etiqueta
              </Link>
            ) : (
              'Pede a um super administrador para criar uma.'
            )}
          </p>
        )}
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
                Etiquetas
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Criado em
              </th>
              {canMutateRoles && (
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Papel
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {profiles.map((row) => {
              const isSelf = row.id === user.id;
              const isSuperAdmin = row.role === 'super_admin';
              const canMutateRow = canMutateRoles && !isSelf && !isSuperAdmin;
              const nextRole: 'user' | 'admin' = row.role === 'admin' ? 'user' : 'admin';
              const actionLabel =
                row.role === 'admin' ? 'Despromover a utilizador' : 'Promover a admin';

              const assigned = tagsByUser.get(row.id) ?? [];

              return (
                <tr key={row.id} className="text-ink align-top">
                  <td className="px-4 py-3 font-medium">{row.display_name}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[row.role]}</td>
                  <td className="px-4 py-3">
                    <UserTagsCell
                      userId={row.id}
                      userName={row.display_name}
                      assigned={assigned}
                      allTags={tags}
                    />
                  </td>
                  <td className="px-4 py-3">{formatDate(row.created_at)}</td>
                  {canMutateRoles && (
                    <td className="px-4 py-3 text-right">
                      {canMutateRow ? (
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            await setUserRoleAction(formData);
                          }}
                        >
                          <input type="hidden" name="targetId" value={row.id} />
                          <input type="hidden" name="newRole" value={nextRole} />
                          <SubmitButton
                            pendingLabel={row.role === 'admin' ? 'A despromover…' : 'A promover…'}
                            className="bg-transparent text-orange-primary hover:bg-muted/40 hover:text-orange-hover h-auto rounded-md px-2 py-1 text-xs font-medium"
                          >
                            {actionLabel}
                          </SubmitButton>
                        </form>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {isSelf ? 'Tu' : 'Sem ação'}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
