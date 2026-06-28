'use server';

/**
 * Server Actions de gestão de papéis — V2 PR3 (+ promoção a super_admin).
 *
 * Apenas `super_admin` pode mudar o `role` de outro utilizador, para `user`,
 * `admin` ou `super_admin`. Promover a super_admin é irreversível pela UI: um
 * super_admin existente não pode ser despromovido aqui (só por SQL directo).
 * Defesa em profundidade:
 *
 *   1. Esta action recusa se o caller não for super_admin, se o alvo for o
 *      próprio caller, ou se o alvo já for super_admin.
 *   2. RLS em `profiles` (policy `profiles_update_super_admin`) garante que o
 *      update por outro role nunca afecta linhas.
 *   3. Trigger `enforce_profiles_role_mutation_authority` bloqueia mudanças
 *      inválidas mesmo via service role / SQL directo (e impede tocar num
 *      super_admin existente).
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin, isSuperAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';

export type SetUserRoleResult = { ok: true } | { ok: false; error: string };

export async function setUserRoleAction(formData: FormData): Promise<SetUserRoleResult> {
  const caller = await getCurrentUser();
  if (!caller || !isSuperAdmin(caller.role)) {
    return { ok: false, error: 'Apenas super_admin pode alterar papéis.' };
  }

  const targetId = formData.get('targetId');
  const newRole = formData.get('newRole');

  if (typeof targetId !== 'string' || !UUID_RE.test(targetId)) {
    return { ok: false, error: 'targetId inválido.' };
  }
  if (newRole !== 'user' && newRole !== 'admin' && newRole !== 'super_admin') {
    return { ok: false, error: 'newRole inválido (esperado user, admin ou super_admin).' };
  }

  if (targetId === caller.id) {
    return { ok: false, error: 'Não podes alterar o teu próprio papel.' };
  }

  const supabase = await getServerClient();

  const { data: target, error: lookupError } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', targetId)
    .maybeSingle<{ id: string; role: 'user' | 'admin' | 'super_admin' }>();

  if (lookupError || !target) {
    return { ok: false, error: 'Utilizador não encontrado.' };
  }

  if (isSuperAdmin(target.role)) {
    return { ok: false, error: 'Não é possível alterar o papel de um super administrador.' };
  }

  if (target.role === newRole) {
    return { ok: true };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetId);

  if (updateError) {
    return { ok: false, error: `Falha a atualizar papel: ${updateError.message}` };
  }

  revalidatePath('/admin/utilizadores');
  return { ok: true };
}

/**
 * Atribuição de etiquetas a utilizadores — V3 PR1.
 *
 * Defesa em profundidade:
 *   1. Esta action recusa se o caller não for admin nem super_admin.
 *   2. RLS em `user_tags` (user_tags_insert_admin/user_tags_delete_admin)
 *      garante que escritas por outro role nunca tocam dados.
 *   3. PK composta (user_id, tag_id) torna a atribuição idempotente
 *      via `upsert` com `ignoreDuplicates: true`.
 */

export type AssignTagResult = { ok: true } | { ok: false; error: string };

export async function assignTagAction(formData: FormData): Promise<AssignTagResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode atribuir etiquetas.' };
  }

  const userId = formData.get('userId');
  const tagId = formData.get('tagId');

  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return { ok: false, error: 'userId inválido.' };
  }
  if (typeof tagId !== 'string' || !UUID_RE.test(tagId)) {
    return { ok: false, error: 'tagId inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('user_tags')
    .upsert(
      { user_id: userId, tag_id: tagId, assigned_by: caller.id },
      { onConflict: 'user_id,tag_id', ignoreDuplicates: true },
    );

  if (error) {
    return { ok: false, error: `Falha a atribuir etiqueta: ${error.message}` };
  }

  revalidatePath('/admin/utilizadores');
  return { ok: true };
}

/**
 * Atribuição de uma etiqueta a vários utilizadores de uma vez (afinação
 * pré-lançamento). Mesmo modelo de defesa do `assignTagAction`: caller
 * admin/super_admin, RLS em `user_tags`, upsert idempotente (PK composta).
 * Recebe `tagId` + N campos `userId` (uma checkbox marcada por utilizador na
 * tabela). userIds são deduplicados e validados; tem de haver pelo menos um.
 */
export type AssignTagToUsersResult = { ok: true; count: number } | { ok: false; error: string };

export async function assignTagToUsersAction(formData: FormData): Promise<AssignTagToUsersResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode atribuir etiquetas.' };
  }

  const tagId = formData.get('tagId');
  if (typeof tagId !== 'string' || !UUID_RE.test(tagId)) {
    return { ok: false, error: 'tagId inválido.' };
  }

  const userIds = Array.from(
    new Set(
      formData
        .getAll('userId')
        .filter((v): v is string => typeof v === 'string' && UUID_RE.test(v)),
    ),
  );
  if (userIds.length === 0) {
    return { ok: false, error: 'Seleciona pelo menos um utilizador.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.from('user_tags').upsert(
    userIds.map((userId) => ({ user_id: userId, tag_id: tagId, assigned_by: caller.id })),
    { onConflict: 'user_id,tag_id', ignoreDuplicates: true },
  );

  if (error) {
    return { ok: false, error: `Falha a atribuir etiqueta: ${error.message}` };
  }

  revalidatePath('/admin/utilizadores');
  return { ok: true, count: userIds.length };
}

export async function unassignTagAction(formData: FormData): Promise<AssignTagResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode remover etiquetas.' };
  }

  const userId = formData.get('userId');
  const tagId = formData.get('tagId');

  if (typeof userId !== 'string' || !UUID_RE.test(userId)) {
    return { ok: false, error: 'userId inválido.' };
  }
  if (typeof tagId !== 'string' || !UUID_RE.test(tagId)) {
    return { ok: false, error: 'tagId inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('user_tags')
    .delete()
    .eq('user_id', userId)
    .eq('tag_id', tagId);

  if (error) {
    return { ok: false, error: `Falha a remover etiqueta: ${error.message}` };
  }

  revalidatePath('/admin/utilizadores');
  return { ok: true };
}
