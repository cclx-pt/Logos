'use server';

/**
 * Server Actions de gestão de cursos — V3 PR3 + V3.1 (sem slug).
 *
 * Admin e super_admin podem criar/editar/apagar cursos. Defesa em profundidade:
 *
 *   1. Esta action recusa se o caller não for admin nem super_admin.
 *   2. RLS em `courses` (policies courses_insert/update/delete_admin) garante
 *      que escritas por outro role nunca tocam dados.
 *   3. CHECK constraints na DB (title length) defendem contra inputs maliciosos
 *      via service role. Coluna `slug` foi removida em V3.1 — URLs públicas
 *      passam a `/conteudos/<uuid>`.
 *
 * `published_at` é gerido como "data da primeira publicação preservada": ao
 * publicar pela primeira vez, fixa `now()`; ao despublicar volta a NULL;
 * ao re-publicar usa de novo `now()`. Manter a UX simples — sem campo de data
 * separado em V3.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';

export type CreateCourseResult = { ok: true; id: string } | { ok: false; error: string };
export type CourseActionResult = { ok: true } | { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TITLE_MIN = 1;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 4000;
const ICON_MAX = 64;

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; error: string };

function validateTitle(raw: unknown): Ok<string> | Err {
  if (typeof raw !== 'string') return { ok: false, error: 'Título inválido.' };
  const value = raw.trim();
  if (value.length < TITLE_MIN || value.length > TITLE_MAX) {
    return {
      ok: false,
      error: `Título tem de ter entre ${TITLE_MIN} e ${TITLE_MAX} caracteres.`,
    };
  }
  return { ok: true, value };
}

function validateOptionalText(
  raw: unknown,
  max: number,
  fieldName: string,
): Ok<string | null> | Err {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null };
  if (typeof raw !== 'string') return { ok: false, error: `${fieldName} inválido.` };
  const value = raw.trim();
  if (value === '') return { ok: true, value: null };
  if (value.length > max) {
    return { ok: false, error: `${fieldName} excede o limite de ${max} caracteres.` };
  }
  return { ok: true, value };
}

function validateRequiredTags(raws: FormDataEntryValue[]): Ok<string[]> | Err {
  const out: string[] = [];
  for (const raw of raws) {
    if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
      return { ok: false, error: 'required_tags contém um valor que não é UUID.' };
    }
    if (!out.includes(raw)) out.push(raw);
  }
  return { ok: true, value: out };
}

function callerIsAdmin(role: string): boolean {
  return role === 'admin' || role === 'super_admin';
}

export async function createCourseAction(formData: FormData): Promise<CreateCourseResult> {
  const caller = await getCurrentUser();
  if (!caller || !callerIsAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode criar cursos.' };
  }

  const title = validateTitle(formData.get('title'));
  if (!title.ok) return title;
  const description = validateOptionalText(
    formData.get('description'),
    DESCRIPTION_MAX,
    'Descrição',
  );
  if (!description.ok) return description;
  const icon = validateOptionalText(formData.get('icon'), ICON_MAX, 'Ícone');
  if (!icon.ok) return icon;
  const requiredTags = validateRequiredTags(formData.getAll('required_tags'));
  if (!requiredTags.ok) return requiredTags;

  const published = formData.get('published') === 'on';

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('courses')
    .insert({
      title: title.value,
      description: description.value,
      icon: icon.value,
      required_tags: requiredTags.value,
      published_at: published ? new Date().toISOString() : null,
      created_by: caller.id,
    })
    .select('id')
    .single<{ id: string }>();

  if (error) {
    return { ok: false, error: `Falha a criar curso: ${error.message}` };
  }

  revalidatePath('/admin/conteudos');
  revalidatePath('/conteudos');
  return { ok: true, id: data.id };
}

export async function updateCourseAction(formData: FormData): Promise<CourseActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !callerIsAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode alterar cursos.' };
  }

  const idRaw = formData.get('id');
  if (typeof idRaw !== 'string' || !UUID_RE.test(idRaw)) {
    return { ok: false, error: 'id inválido.' };
  }

  const title = validateTitle(formData.get('title'));
  if (!title.ok) return title;
  const description = validateOptionalText(
    formData.get('description'),
    DESCRIPTION_MAX,
    'Descrição',
  );
  if (!description.ok) return description;
  const icon = validateOptionalText(formData.get('icon'), ICON_MAX, 'Ícone');
  if (!icon.ok) return icon;
  const requiredTags = validateRequiredTags(formData.getAll('required_tags'));
  if (!requiredTags.ok) return requiredTags;

  const published = formData.get('published') === 'on';

  const supabase = await getServerClient();

  const { data: current, error: lookupError } = await supabase
    .from('courses')
    .select('published_at')
    .eq('id', idRaw)
    .maybeSingle<{ published_at: string | null }>();

  if (lookupError) {
    return { ok: false, error: `Falha a carregar curso: ${lookupError.message}` };
  }
  if (!current) {
    return { ok: false, error: 'Curso não encontrado.' };
  }

  let publishedAt: string | null;
  if (!published) {
    publishedAt = null;
  } else if (current.published_at) {
    publishedAt = current.published_at;
  } else {
    publishedAt = new Date().toISOString();
  }

  const { error: updateError } = await supabase
    .from('courses')
    .update({
      title: title.value,
      description: description.value,
      icon: icon.value,
      required_tags: requiredTags.value,
      published_at: publishedAt,
    })
    .eq('id', idRaw);

  if (updateError) {
    return { ok: false, error: `Falha a atualizar curso: ${updateError.message}` };
  }

  revalidatePath('/admin/conteudos');
  revalidatePath(`/admin/conteudos/${idRaw}`);
  revalidatePath('/conteudos');
  return { ok: true };
}

export async function deleteCourseAction(formData: FormData): Promise<CourseActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !callerIsAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode apagar cursos.' };
  }

  const idRaw = formData.get('id');
  if (typeof idRaw !== 'string' || !UUID_RE.test(idRaw)) {
    return { ok: false, error: 'id inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.from('courses').delete().eq('id', idRaw);

  if (error) {
    return { ok: false, error: `Falha a apagar curso: ${error.message}` };
  }

  revalidatePath('/admin/conteudos');
  revalidatePath('/conteudos');
  return { ok: true };
}
