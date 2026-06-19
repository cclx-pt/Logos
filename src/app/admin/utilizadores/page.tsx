import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { ListSearch } from '@/components/admin/list-search';
import { SubmitButton } from '@/components/ui/submit-button';
import {
  getAuthEmailsByProfileIds,
  getCurrentUser,
  getServerClient,
  ROLE_LABEL,
  type Role,
} from '@/lib/auth';
import { isAdmin, isSuperAdmin } from '@/lib/auth/guards';
import { formatDate } from '@/lib/format';
import { assignTagToUsersAction, setUserRoleAction } from './actions';
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

export default async function UtilizadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ 'promover-super'?: string }>;
}) {
  const user = await getCurrentUser();
  // Acesso para admin e super_admin. Promover/despromover continua restrito a
  // super_admin no Server Action; a UI condiciona o botão.
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const canMutateRoles = isSuperAdmin(user.role);
  // Confirmação inline de promoção a super_admin (URL-driven, como `?apagar=`
  // nas etiquetas). Só super_admin a vê e só sobre alvos não-super.
  const { 'promover-super': confirmingSuperId } = await searchParams;

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

  // Emails lidos da camada de identidade (auth.users) - nunca duplicados em
  // tabelas Logos. Em lote para a lista toda. Perfis sem email ficam de fora
  // do Map (ex.: utilizador removido do lado de identidade).
  const emailByProfileId = await getAuthEmailsByProfileIds(profiles.map((p) => p.id));

  // Checkbox de seleção (1) + Nome + Email + Papel + Etiquetas + Criado em (6),
  // mais a coluna de ação de papel quando o caller é super_admin.
  const columnCount = canMutateRoles ? 7 : 6;

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
            ? 'Aqui podes promover utilizadores a administrador ou super administrador, despromover administradores a utilizador, e atribuir etiquetas a qualquer utilizador. Promover a super administrador é irreversível pela interface; despromover um super administrador é feito só via SQL.'
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

      <ListSearch label="Pesquisar utilizador" placeholder="Pesquisar por nome, email ou papel...">
        {/* Atribuição em lote: marca as checkboxes dos utilizadores na tabela,
            escolhe uma etiqueta e atribui a todos de uma vez. As checkboxes
            estão associadas a este form pelo atributo `form=` (não estão
            aninhadas nele), para conviver com os forms de papel de cada linha. */}
        {tags.length > 0 && (
          <form
            id="bulk-tag-form"
            action={async (formData: FormData) => {
              'use server';
              if (formData.getAll('userId').length === 0) {
                redirect('/admin/utilizadores?erro=selecao_vazia');
              }
              const result = await assignTagToUsersAction(formData);
              redirect(
                result.ok
                  ? '/admin/utilizadores?guardado=etiquetas_atribuidas'
                  : '/admin/utilizadores?erro=generico',
              );
            }}
            className="border-border bg-muted/20 flex flex-wrap items-end gap-3 rounded-lg border p-4"
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="bulk-tag-select" className="text-ink text-xs font-medium">
                Atribuir etiqueta aos utilizadores selecionados
              </label>
              <select
                id="bulk-tag-select"
                name="tagId"
                required
                defaultValue=""
                className="border-border bg-background text-ink focus-visible:ring-ring rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
              >
                <option value="" disabled>
                  Escolher etiqueta…
                </option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton
              pendingLabel="A atribuir…"
              className="bg-orange-primary hover:bg-orange-hover h-10 rounded-md px-4 text-sm font-medium text-white"
            >
              Atribuir aos selecionados
            </SubmitButton>
            <p className="text-muted-foreground basis-full text-xs sm:basis-auto">
              Marca os utilizadores na coluna à esquerda da tabela.
            </p>
          </form>
        )}

        <div className="border-border overflow-hidden rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  <span className="sr-only">Selecionar</span>
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Nome
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Email
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
                const targetIsSuperAdmin = isSuperAdmin(row.role);
                const canMutateRow = canMutateRoles && !isSelf && !targetIsSuperAdmin;
                const nextRole: 'user' | 'admin' = row.role === 'admin' ? 'user' : 'admin';
                const actionLabel =
                  row.role === 'admin' ? 'Despromover a utilizador' : 'Promover a admin';

                const assigned = tagsByUser.get(row.id) ?? [];
                const tagSearchText = assigned.map((t) => t.label.toLowerCase()).join(' ');
                const email = emailByProfileId.get(row.id) ?? null;

                // Confirmação inline de promoção a super_admin.
                if (canMutateRow && confirmingSuperId === row.id) {
                  return (
                    <tr
                      key={row.id}
                      className="border-l-orange-primary bg-orange-primary/10 border-l-4"
                    >
                      <td colSpan={columnCount} className="px-4 py-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <p className="text-ink max-w-prose text-sm">
                            Promover <strong className="font-semibold">{row.display_name}</strong> a
                            super administrador? Um super administrador pode gerir tudo, incluindo
                            promover outros. Esta ação{' '}
                            <strong>não pode ser revertida pela interface</strong>: só por SQL.
                          </p>
                          <div className="flex gap-2">
                            <form
                              action={async (formData: FormData) => {
                                'use server';
                                const result = await setUserRoleAction(formData);
                                redirect(
                                  result.ok
                                    ? '/admin/utilizadores?guardado=papel_atualizado'
                                    : '/admin/utilizadores?erro=generico',
                                );
                              }}
                            >
                              <input type="hidden" name="targetId" value={row.id} />
                              <input type="hidden" name="newRole" value="super_admin" />
                              <SubmitButton
                                pendingLabel="A promover…"
                                className="bg-orange-primary hover:bg-orange-hover h-9 rounded-md px-3 text-xs font-medium text-white"
                              >
                                Promover a super administrador
                              </SubmitButton>
                            </form>
                            <Link
                              href="/admin/utilizadores"
                              className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Cancelar
                            </Link>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr
                    key={row.id}
                    data-search-text={`${row.display_name.toLowerCase()} ${(email ?? '').toLowerCase()} ${ROLE_LABEL[row.role].toLowerCase()} ${tagSearchText}`}
                    className="text-ink align-top"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        name="userId"
                        value={row.id}
                        form="bulk-tag-form"
                        aria-label={`Selecionar ${row.display_name}`}
                        className="accent-orange-primary h-4 w-4 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{row.display_name}</td>
                    <td className="text-muted-foreground px-4 py-3">
                      {email ?? <span className="italic">sem email</span>}
                    </td>
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
                          <div className="flex flex-col items-end gap-1.5">
                            <form
                              action={async (formData: FormData) => {
                                'use server';
                                const result = await setUserRoleAction(formData);
                                redirect(
                                  result.ok
                                    ? '/admin/utilizadores?guardado=papel_atualizado'
                                    : '/admin/utilizadores?erro=generico',
                                );
                              }}
                            >
                              <input type="hidden" name="targetId" value={row.id} />
                              <input type="hidden" name="newRole" value={nextRole} />
                              <SubmitButton
                                pendingLabel={
                                  row.role === 'admin' ? 'A despromover…' : 'A promover…'
                                }
                                className="text-orange-primary hover:bg-muted/40 hover:text-orange-hover h-auto rounded-md bg-transparent px-2 py-1 text-xs font-medium"
                              >
                                {actionLabel}
                              </SubmitButton>
                            </form>
                            <Link
                              href={`/admin/utilizadores?promover-super=${row.id}`}
                              className="text-muted-foreground hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Promover a super admin
                            </Link>
                          </div>
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
      </ListSearch>
    </div>
  );
}
