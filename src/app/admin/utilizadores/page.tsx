import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser, getServerClient, type Role } from '@/lib/auth';
import { assignTagAction, setUserRoleAction, unassignTagAction } from './actions';

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
  slug: string;
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
      .select('id, slug, label')
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
              const assignedIds = new Set(assigned.map((t) => t.id));
              const available = tags.filter((t) => !assignedIds.has(t.id));

              return (
                <tr key={row.id} className="text-ink align-top">
                  <td className="px-4 py-3 font-medium">{row.display_name}</td>
                  <td className="px-4 py-3">{ROLE_LABEL[row.role]}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {assigned.length === 0 ? (
                        <span className="text-muted-foreground text-xs">Sem etiquetas</span>
                      ) : (
                        assigned.map((tag) => (
                          <form
                            key={tag.id}
                            action={async (formData: FormData) => {
                              'use server';
                              await unassignTagAction(formData);
                            }}
                          >
                            <input type="hidden" name="userId" value={row.id} />
                            <input type="hidden" name="tagId" value={tag.id} />
                            <button
                              type="submit"
                              aria-label={`Remover etiqueta ${tag.label} de ${row.display_name}`}
                              className="border-border bg-sage-card text-ink hover:bg-destructive/10 hover:border-destructive/30 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              {tag.label}
                              <span aria-hidden="true" className="text-muted-foreground">
                                ×
                              </span>
                            </button>
                          </form>
                        ))
                      )}
                    </div>
                    {available.length > 0 && (
                      <form
                        action={async (formData: FormData) => {
                          'use server';
                          await assignTagAction(formData);
                        }}
                        className="mt-2 flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={row.id} />
                        <label className="sr-only" htmlFor={`tag-select-${row.id}`}>
                          Adicionar etiqueta a {row.display_name}
                        </label>
                        <select
                          id={`tag-select-${row.id}`}
                          name="tagId"
                          required
                          defaultValue=""
                          className="border-border bg-background text-ink focus-visible:ring-ring rounded-md border px-2 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <option value="" disabled>
                            Adicionar etiqueta…
                          </option>
                          {available.map((tag) => (
                            <option key={tag.id} value={tag.id}>
                              {tag.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="submit"
                          className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Adicionar
                        </button>
                      </form>
                    )}
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
                          <button
                            type="submit"
                            className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {actionLabel}
                          </button>
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
