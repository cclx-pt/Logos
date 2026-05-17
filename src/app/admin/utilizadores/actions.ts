'use server';

/**
 * Server Actions de gestão de papéis — V2 PR3.
 *
 * Apenas `super_admin` pode mudar o `role` de outro utilizador, e apenas entre
 * `user` ⇄ `admin`. Defesa em profundidade:
 *
 *   1. Esta action recusa se o caller não for super_admin, se o alvo for o
 *      próprio caller, ou se o alvo já for super_admin.
 *   2. RLS em `profiles` (policy `profiles_update_super_admin`) garante que o
 *      update por outro role nunca afecta linhas.
 *   3. Trigger `enforce_profiles_role_mutation_authority` bloqueia mudanças
 *      inválidas mesmo via service role / SQL directo.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';

export type SetUserRoleResult = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function setUserRoleAction(formData: FormData): Promise<SetUserRoleResult> {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== 'super_admin') {
    return { ok: false, error: 'Apenas super_admin pode alterar papéis.' };
  }

  const targetId = formData.get('targetId');
  const newRole = formData.get('newRole');

  if (typeof targetId !== 'string' || !UUID_RE.test(targetId)) {
    return { ok: false, error: 'targetId inválido.' };
  }
  if (newRole !== 'user' && newRole !== 'admin') {
    return { ok: false, error: 'newRole inválido (esperado user ou admin).' };
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

  if (target.role === 'super_admin') {
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
