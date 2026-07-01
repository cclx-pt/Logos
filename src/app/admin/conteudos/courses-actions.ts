'use server';

/**
 * Server Actions de gestão de cursos — V3 PR3 + V3.1 (sem slug) + V3.2 PR1 (banner).
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
 *
 * Banner (V3.2 PR1; upload directo em V3.7): opcional. Tal como as sebentas
 * PDF, o ficheiro NÃO passa por esta Server Action - o browser envia-o
 * directamente para o bucket `course-banners` via signed upload URL
 * (`createCourseBannerUploadUrlAction`), contornando o limite de ~4.5 MB do
 * corpo de Functions na Vercel. O path é determinístico `<courseId>/banner`
 * (upsert no mesmo sítio). Create/update só recebem o `banner_storage_path`
 * (string) já validado; tamanho e MIME são impostos pelo bucket. No create, o
 * id do curso é gerado no cliente (e validado aqui) para o path do banner poder
 * existir antes do insert. Update remove banner via checkbox `remove_banner`.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';

import {
  DESCRIPTION_MAX,
  validateBannerStoragePath,
  validateOptionalText,
  validateTitle,
  type Err,
  type Ok,
} from './_lib/validation';

export type CreateCourseResult = { ok: true; id: string } | { ok: false; error: string };
export type CourseActionResult = { ok: true } | { ok: false; error: string };
export type UploadUrlResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

const ICON_MAX = 64;
const BANNER_BUCKET = 'course-banners';

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

/** Profundidade máxima percorrida ao detectar ciclos na cadeia de pré-requisitos. */
const PREREQUISITE_MAX_DEPTH = 50;

/**
 * Valida o pré-requisito (V3.6). `''`/ausente → `null` (curso autónomo).
 * Caso contrário: tem de ser UUID, existir, não ser o próprio curso, e não
 * criar um ciclo na cadeia de pré-requisitos.
 *
 * `selfId` é `null` em create (o curso ainda não existe, logo não pode ser
 * pré-requisito de ninguém → impossível haver ciclo; só validamos
 * existência). Em update percorre a cadeia a partir do candidato: se voltar
 * a `selfId`, é ciclo.
 */
async function validatePrerequisite(
  raw: FormDataEntryValue | null,
  selfId: string | null,
): Promise<Ok<string | null> | Err> {
  if (raw === null || raw === '' || raw === undefined) {
    return { ok: true, value: null };
  }
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    return { ok: false, error: 'Curso pré-requisito inválido.' };
  }
  if (selfId && raw === selfId) {
    return { ok: false, error: 'Um curso não pode ser pré-requisito de si mesmo.' };
  }

  const supabase = await getServerClient();
  // Percorre a cadeia candidato → pré-requisito do candidato → ... À cabeça,
  // confirma que o candidato existe. Se a cadeia chegar a `selfId`, é ciclo.
  // `current` é um snapshot const do cursor (a condição do loop garante que é
  // string), para o input da query não depender do `let` reatribuído a partir
  // de `data` - caso contrário o TS vê inferência circular.
  let cursor: string | null = raw;
  const seen = new Set<string>();
  for (let depth = 0; cursor && depth < PREREQUISITE_MAX_DEPTH; depth++) {
    const current: string = cursor;
    if (selfId && current === selfId) {
      return { ok: false, error: 'Esse curso criaria um ciclo de pré-requisitos.' };
    }
    if (seen.has(current)) break; // ciclo pré-existente noutra parte da cadeia; pára.
    seen.add(current);

    const { data, error } = await supabase
      .from('courses')
      .select('prerequisite_course_id')
      .eq('id', current)
      .maybeSingle<{ prerequisite_course_id: string | null }>();

    if (error) {
      return { ok: false, error: `Falha a validar pré-requisito: ${error.message}` };
    }
    if (!data) {
      // Só o primeiro cursor (o candidato) tem de existir; um elo partido
      // mais abaixo (FK set null) não invalida a escolha.
      if (depth === 0) {
        return { ok: false, error: 'Curso pré-requisito não encontrado.' };
      }
      break;
    }
    cursor = data.prerequisite_course_id;
  }

  return { ok: true, value: raw };
}

function bannerPath(courseId: string): string {
  return `${courseId}/banner`;
}

/**
 * Gera uma signed upload URL para o browser enviar o banner DIRECTAMENTE para o
 * bucket `course-banners`, sem o fazer passar por uma Server Action (contorna o
 * limite de ~4.5 MB do corpo de Functions na Vercel). Path determinístico
 * `<courseId>/banner` com `upsert` (substitui o banner actual no mesmo sítio).
 * Admin-check explícito; tamanho/MIME impostos pelo bucket.
 */
export async function createCourseBannerUploadUrlAction(
  rawCourseId: unknown,
): Promise<UploadUrlResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode enviar banners.' };
  }
  if (typeof rawCourseId !== 'string' || !UUID_RE.test(rawCourseId)) {
    return { ok: false, error: 'Curso inválido.' };
  }

  const supabase = await getServerClient();
  const { data, error } = await supabase.storage
    .from(BANNER_BUCKET)
    .createSignedUploadUrl(bannerPath(rawCourseId), { upsert: true });
  if (error || !data) {
    return { ok: false, error: `Falha a preparar upload: ${error?.message ?? 'desconhecido'}` };
  }
  return { ok: true, path: data.path, token: data.token };
}

async function deleteCourseBanner(courseId: string): Promise<void> {
  const supabase = await getServerClient();
  // Best-effort — se o ficheiro não existir, Supabase devolve sucesso sem erro.
  await supabase.storage.from(BANNER_BUCKET).remove([bannerPath(courseId)]);
}

export async function createCourseAction(formData: FormData): Promise<CreateCourseResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
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
  const sequentialLessons = formData.get('sequential_lessons') === 'on';
  const sequentialModules = formData.get('sequential_modules') === 'on';

  // id gerado no cliente para o path do banner (`<id>/banner`) poder existir
  // antes do insert. Opcional: chamadas sem id deixam a BD gerar.
  let explicitId: string | undefined;
  const idRaw = formData.get('id');
  if (typeof idRaw === 'string' && idRaw.length > 0) {
    if (!UUID_RE.test(idRaw)) return { ok: false, error: 'id inválido.' };
    explicitId = idRaw;
  }

  const prerequisite = await validatePrerequisite(
    formData.get('prerequisite_course_id'),
    explicitId ?? null,
  );
  if (!prerequisite.ok) return prerequisite;

  // Banner: o ficheiro já foi enviado pelo browser (upload directo); aqui só
  // chega o path, que tem de ser `<id>/banner`.
  let bannerStoragePath: string | null = null;
  const bannerPathRaw = formData.get('banner_storage_path');
  if (typeof bannerPathRaw === 'string' && bannerPathRaw.length > 0) {
    if (!explicitId) return { ok: false, error: 'Caminho do banner inválido.' };
    const validated = validateBannerStoragePath(bannerPathRaw, explicitId);
    if (!validated.ok) return validated;
    bannerStoragePath = validated.value;
  }

  const supabase = await getServerClient();
  const { data: inserted, error: insertError } = await supabase
    .from('courses')
    .insert({
      ...(explicitId ? { id: explicitId } : {}),
      title: title.value,
      description: description.value,
      icon: icon.value,
      required_tags: requiredTags.value,
      published_at: published ? new Date().toISOString() : null,
      sequential_lessons: sequentialLessons,
      sequential_modules: sequentialModules,
      prerequisite_course_id: prerequisite.value,
      banner_storage_path: bannerStoragePath,
      created_by: caller.id,
    })
    .select('id')
    .single<{ id: string }>();

  if (insertError) {
    // O banner já está no bucket; se o curso não nasceu, remove-o (best-effort).
    if (bannerStoragePath) {
      await supabase.storage.from(BANNER_BUCKET).remove([bannerStoragePath]);
    }
    return { ok: false, error: `Falha a criar curso: ${insertError.message}` };
  }

  revalidatePath('/admin/conteudos');
  revalidatePath('/conteudos');
  return { ok: true, id: inserted.id };
}

export async function updateCourseAction(formData: FormData): Promise<CourseActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
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
  const sequentialLessons = formData.get('sequential_lessons') === 'on';
  const sequentialModules = formData.get('sequential_modules') === 'on';
  const removeBanner = formData.get('remove_banner') === 'on';
  const bannerPathRaw = formData.get('banner_storage_path');
  const hasNewBanner = typeof bannerPathRaw === 'string' && bannerPathRaw.length > 0;

  const prerequisite = await validatePrerequisite(formData.get('prerequisite_course_id'), idRaw);
  if (!prerequisite.ok) return prerequisite;

  const supabase = await getServerClient();

  const { data: current, error: lookupError } = await supabase
    .from('courses')
    .select('published_at, banner_storage_path')
    .eq('id', idRaw)
    .maybeSingle<{ published_at: string | null; banner_storage_path: string | null }>();

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

  // Resolução de banner_storage_path: novo banner (já enviado pelo browser para
  // `<id>/banner`) tem prioridade sobre remove_banner. Se nenhum dos dois for
  // activado, preserva o path actual.
  let bannerStoragePath: string | null = current.banner_storage_path;
  if (hasNewBanner) {
    const validated = validateBannerStoragePath(bannerPathRaw, idRaw);
    if (!validated.ok) return validated;
    bannerStoragePath = validated.value;
  } else if (removeBanner) {
    await deleteCourseBanner(idRaw);
    bannerStoragePath = null;
  }

  const { error: updateError } = await supabase
    .from('courses')
    .update({
      title: title.value,
      description: description.value,
      icon: icon.value,
      required_tags: requiredTags.value,
      published_at: publishedAt,
      sequential_lessons: sequentialLessons,
      sequential_modules: sequentialModules,
      prerequisite_course_id: prerequisite.value,
      banner_storage_path: bannerStoragePath,
    })
    .eq('id', idRaw);

  if (updateError) {
    return { ok: false, error: `Falha a atualizar curso: ${updateError.message}` };
  }

  revalidatePath('/admin/conteudos');
  revalidatePath(`/admin/conteudos/${idRaw}`);
  revalidatePath('/conteudos');
  revalidatePath(`/conteudos/${idRaw}`);
  return { ok: true };
}

export async function deleteCourseAction(formData: FormData): Promise<CourseActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
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

  // Best-effort cleanup do banner. Se falhar, o ficheiro fica órfão até
  // limpeza manual — mesmo padrão de `deleteLessonAction` para os PDFs.
  await deleteCourseBanner(idRaw);

  revalidatePath('/admin/conteudos');
  revalidatePath('/conteudos');
  return { ok: true };
}
