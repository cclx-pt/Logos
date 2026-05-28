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
 * Banner (V3.2 PR1): opcional. Ficheiro de imagem (JPEG/PNG/WebP, ≤ 5 MB)
 * vai para o bucket `course-banners` no path `<courseId>/banner` (sem
 * extensão; MIME via Content-Type). Falha do upload não bloqueia
 * create/update — o curso fica sem banner e cai no fallback de icon.
 * Update pode remover banner via checkbox `remove_banner`.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';

export type CreateCourseResult = { ok: true; id: string } | { ok: false; error: string };
export type CourseActionResult = { ok: true } | { ok: false; error: string };

const TITLE_MIN = 1;
const TITLE_MAX = 120;
const DESCRIPTION_MAX = 4000;
const ICON_MAX = 64;
const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5 MB — alinhado com storage.buckets.
const ALLOWED_BANNER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

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

function bannerPath(courseId: string): string {
  return `${courseId}/banner`;
}

/**
 * Valida e faz upload de um banner para o bucket `course-banners`. Devolve
 * o path relativo em caso de sucesso. Isolada por simetria com
 * `uploadLessonPdf` em `lessons-actions.ts` — testes podem mockar.
 */
async function uploadCourseBanner(file: File, courseId: string): Promise<Ok<string> | Err> {
  if (!ALLOWED_BANNER_TYPES.has(file.type)) {
    return { ok: false, error: 'Banner tem de ser JPEG, PNG ou WebP.' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Ficheiro de banner está vazio.' };
  }
  if (file.size > MAX_BANNER_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: `Banner excede 5 MB (tem ${mb} MB).` };
  }

  const supabase = await getServerClient();
  const path = bannerPath(courseId);
  const { error } = await supabase.storage.from('course-banners').upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) {
    return { ok: false, error: `Falha a fazer upload do banner: ${error.message}` };
  }
  return { ok: true, value: path };
}

async function deleteCourseBanner(courseId: string): Promise<void> {
  const supabase = await getServerClient();
  // Best-effort — se o ficheiro não existir, Supabase devolve sucesso sem erro.
  await supabase.storage.from('course-banners').remove([bannerPath(courseId)]);
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

  const bannerFile = formData.get('banner');
  const hasBanner = bannerFile instanceof File && bannerFile.size > 0;

  // Validação prévia do banner (antes de inserir o curso) — evita ter de
  // rollback do row se for inválido. Limites de tipo/tamanho são checks
  // baratos sem tocar em Storage.
  if (hasBanner) {
    const file = bannerFile as File;
    if (!ALLOWED_BANNER_TYPES.has(file.type)) {
      return { ok: false, error: 'Banner tem de ser JPEG, PNG ou WebP.' };
    }
    if (file.size > MAX_BANNER_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return { ok: false, error: `Banner excede 5 MB (tem ${mb} MB).` };
    }
  }

  const supabase = await getServerClient();
  const { data: inserted, error: insertError } = await supabase
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

  if (insertError) {
    return { ok: false, error: `Falha a criar curso: ${insertError.message}` };
  }

  if (hasBanner) {
    const upload = await uploadCourseBanner(bannerFile as File, inserted.id);
    if (!upload.ok) {
      // Banner é opcional — falha do upload não derruba o curso. Apenas
      // sinaliza ao admin para tentar de novo em edit.
      return { ok: false, error: `Curso criado, mas o banner falhou: ${upload.error}` };
    }
    const { error: pathError } = await supabase
      .from('courses')
      .update({ banner_storage_path: upload.value })
      .eq('id', inserted.id);
    if (pathError) {
      return {
        ok: false,
        error: `Curso criado, mas registo do banner falhou: ${pathError.message}`,
      };
    }
  }

  revalidatePath('/admin/conteudos');
  revalidatePath('/conteudos');
  return { ok: true, id: inserted.id };
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
  const removeBanner = formData.get('remove_banner') === 'on';
  const bannerFile = formData.get('banner');
  const hasNewBanner = bannerFile instanceof File && bannerFile.size > 0;

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

  // Resolução de banner_storage_path: nova upload tem prioridade sobre
  // remove_banner (admin pode trocar em vez de remover). Se nenhum dos dois
  // for activado, preserva o path actual.
  let bannerStoragePath: string | null = current.banner_storage_path;
  if (hasNewBanner) {
    const upload = await uploadCourseBanner(bannerFile as File, idRaw);
    if (!upload.ok) return upload;
    bannerStoragePath = upload.value;
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

  // Best-effort cleanup do banner. Se falhar, o ficheiro fica órfão até
  // limpeza manual — mesmo padrão de `deleteLessonAction` para os PDFs.
  await deleteCourseBanner(idRaw);

  revalidatePath('/admin/conteudos');
  revalidatePath('/conteudos');
  return { ok: true };
}
