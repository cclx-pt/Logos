'use server';

/**
 * Server Actions de gestão de etiquetas — V3 PR1.
 *
 * Apenas `super_admin` cria/edita/apaga etiquetas (governança do catálogo).
 * Atribuir etiquetas a utilizadores é feito em `/admin/utilizadores/actions.ts`
 * (assign/unassign) por admin OU super_admin.
 *
 * Defesa em profundidade:
 *   1. Esta action recusa se o caller não for super_admin.
 *   2. RLS em `tags` (policies tags_insert/update/delete_super_admin) garante
 *      que escritas por outro role nunca tocam dados.
 *   3. CHECK constraints na DB (slug regex + length, label length) defendem
 *      contra inputs maliciosos via service role.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';

export type TagActionResult = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SLUG_MIN = 2;
const SLUG_MAX = 64;
const LABEL_MIN = 1;
const LABEL_MAX = 80;

function validateSlug(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Slug inválido.' };
  const value = raw.trim();
  if (value.length < SLUG_MIN || value.length > SLUG_MAX) {
    return {
      ok: false,
      error: `Slug tem de ter entre ${SLUG_MIN} e ${SLUG_MAX} caracteres.`,
    };
  }
  if (!SLUG_RE.test(value)) {
    return {
      ok: false,
      error: 'Slug só pode ter letras minúsculas, dígitos e hífens (ex.: mentoria-cclx).',
    };
  }
  return { ok: true, value };
}

function validateLabel(raw: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Nome inválido.' };
  const value = raw.trim();
  if (value.length < LABEL_MIN || value.length > LABEL_MAX) {
    return {
      ok: false,
      error: `Nome tem de ter entre ${LABEL_MIN} e ${LABEL_MAX} caracteres.`,
    };
  }
  return { ok: true, value };
}

export async function createTagAction(formData: FormData): Promise<TagActionResult> {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== 'super_admin') {
    return { ok: false, error: 'Apenas super_admin pode criar etiquetas.' };
  }

  const slug = validateSlug(formData.get('slug'));
  if (!slug.ok) return slug;
  const label = validateLabel(formData.get('label'));
  if (!label.ok) return label;

  const supabase = await getServerClient();
  const { error } = await supabase.from('tags').insert({
    slug: slug.value,
    label: label.value,
    created_by: caller.id,
  });

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `Já existe uma etiqueta com o slug "${slug.value}".` };
    }
    return { ok: false, error: `Falha a criar etiqueta: ${error.message}` };
  }

  revalidatePath('/admin/etiquetas');
  return { ok: true };
}

export async function updateTagAction(formData: FormData): Promise<TagActionResult> {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== 'super_admin') {
    return { ok: false, error: 'Apenas super_admin pode alterar etiquetas.' };
  }

  const idRaw = formData.get('id');
  if (typeof idRaw !== 'string' || !UUID_RE.test(idRaw)) {
    return { ok: false, error: 'id inválido.' };
  }
  const slug = validateSlug(formData.get('slug'));
  if (!slug.ok) return slug;
  const label = validateLabel(formData.get('label'));
  if (!label.ok) return label;

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('tags')
    .update({ slug: slug.value, label: label.value })
    .eq('id', idRaw);

  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: `Já existe uma etiqueta com o slug "${slug.value}".` };
    }
    return { ok: false, error: `Falha a atualizar etiqueta: ${error.message}` };
  }

  revalidatePath('/admin/etiquetas');
  return { ok: true };
}

export async function deleteTagAction(formData: FormData): Promise<TagActionResult> {
  const caller = await getCurrentUser();
  if (!caller || caller.role !== 'super_admin') {
    return { ok: false, error: 'Apenas super_admin pode apagar etiquetas.' };
  }

  const idRaw = formData.get('id');
  if (typeof idRaw !== 'string' || !UUID_RE.test(idRaw)) {
    return { ok: false, error: 'id inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.from('tags').delete().eq('id', idRaw);

  if (error) {
    return { ok: false, error: `Falha a apagar etiqueta: ${error.message}` };
  }

  revalidatePath('/admin/etiquetas');
  revalidatePath('/admin/utilizadores');
  return { ok: true };
}
