'use server';

/**
 * Server Actions de gestão de aulas — V3 PR4b.
 *
 * Triple defesa:
 *   1. Esta action recusa se o caller não for admin nem super_admin.
 *   2. RLS em `lessons` (policies lessons_insert/update/delete_admin) garante
 *      que escritas por outro role nunca tocam dados.
 *   3. CHECK constraints na DB (position >= 0, length(title) 1-120,
 *      template in ('pdf','video','video_pdf'); vídeo ⇒ youtube_url not null;
 *      sebenta (pdf|video_pdf) ⇒ pdf_storage_path not null) defendem contra
 *      inputs maliciosos. Migration de 12-06-2026 (V3.4).
 *
 * Coerência de template (V3.4 estende a decisão de 19-05-2026, v3-plan.md §10):
 *   - Templates com vídeo (video, video_pdf) exigem `youtube_url` no mesmo
 *     submit; template `pdf` limpa qualquer URL antigo.
 *   - Templates com sebenta (pdf, video_pdf) exigem PDF; `video` (só vídeo)
 *     não tem sebenta e guarda `pdf_storage_path = null` (ficheiro removido
 *     best-effort ao migrar de/para esse template).
 *
 * Upload PDF (upload directo, V3.7): o ficheiro NUNCA passa por esta Server
 * Action - o browser envia-o directamente para o bucket via signed upload URL
 * (`createLessonPdfUploadUrlAction`). Isto contorna o limite de ~4.5 MB do corpo
 * de Functions na Vercel, que o `bodySizeLimit` do Next não sobrepõe e que
 * rejeitava PDFs legítimos (5-20 MB) antes de o código os ver. O path é
 * `lesson-pdfs/<courseId>/<uuid>.pdf` (prefixo do curso = fronteira da policy
 * RLS; nome aleatório, desligado do id da aula). Create/update só recebem o
 * `pdf_storage_path` (string) já validado; o tamanho e o MIME são impostos pelo
 * bucket no upload. A limpeza (delete, troca para vídeo, substituição de PDF) lê
 * o path guardado na row - já não o reconstrói a partir do id.
 *
 * Reordenar (↑↓): mesmo padrão do moveModule — swap de `position` com o
 * vizinho imediato dentro do mesmo `module_id`. Sem UNIQUE em
 * `(module_id, position)`, a janela de colisão é inofensiva.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';

import {
  DESCRIPTION_MAX,
  validateOptionalText,
  validatePdfStoragePath,
  validateTitle,
  validateUuid,
  type Err,
  type Ok,
} from './_lib/validation';

export type CreateLessonResult = { ok: true; id: string } | { ok: false; error: string };
export type LessonActionResult = { ok: true } | { ok: false; error: string };
export type UploadUrlResult =
  | { ok: true; path: string; token: string }
  | { ok: false; error: string };

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.)?(?:youtu\.be\/[A-Za-z0-9_-]{6,}|youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,})\S*$/i;
const TEMPLATES = ['pdf', 'video', 'video_pdf'] as const;
type Template = (typeof TEMPLATES)[number];
const PDF_BUCKET = 'lesson-pdfs';

// Coerência template ↔ campos (V3.4): vídeo exige YouTube; só 'video'
// dispensa sebenta. Espelha os CHECK em `lessons` (migration de 12-06-2026).
function templateHasVideo(template: Template): boolean {
  return template !== 'pdf';
}
function templateHasPdf(template: Template): boolean {
  return template !== 'video';
}

function validateTemplate(raw: unknown): Ok<Template> | Err {
  if (typeof raw !== 'string' || !TEMPLATES.includes(raw as Template)) {
    return { ok: false, error: 'Template tem de ser "pdf", "video" ou "video_pdf".' };
  }
  return { ok: true, value: raw as Template };
}

function validateYoutubeUrl(raw: unknown): Ok<string> | Err {
  if (typeof raw !== 'string') return { ok: false, error: 'URL do YouTube inválido.' };
  const value = raw.trim();
  if (!YOUTUBE_RE.test(value)) {
    return {
      ok: false,
      error:
        'URL do YouTube tem de ser do formato https://youtu.be/<id> ou https://www.youtube.com/watch?v=<id>.',
    };
  }
  return { ok: true, value };
}

function revalidateLessonPages(courseId: string, moduleId: string): void {
  revalidatePath(`/admin/conteudos/${courseId}/${moduleId}`);
  revalidatePath(`/admin/conteudos/${courseId}`);
  revalidatePath('/conteudos');
}

/**
 * Gera uma signed upload URL para o browser enviar o PDF DIRECTAMENTE para o
 * bucket `lesson-pdfs`, sem o fazer passar por uma Server Action. É o que
 * contorna o limite de ~4.5 MB do corpo de Functions na Vercel.
 *
 * O path é decidido aqui (`<courseId>/<uuid>.pdf`): determinístico no prefixo
 * (a policy RLS `lesson_pdfs_select_visible` extrai o courseId daí) e aleatório
 * no nome (evita colisões e desliga o path do id da aula, que no create ainda
 * não existe). Admin-check explícito; a INSERT RLS de `storage.objects`
 * (admin-only) é validada ao assinar com a sessão do admin. O token autoriza
 * escrever só nesse path; tamanho (<=20 MB) e MIME são impostos pelo bucket.
 */
export async function createLessonPdfUploadUrlAction(
  rawCourseId: unknown,
): Promise<UploadUrlResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode enviar sebentas.' };
  }
  const courseId = validateUuid(rawCourseId, 'course_id');
  if (!courseId.ok) return courseId;

  const supabase = await getServerClient();
  const path = `${courseId.value}/${crypto.randomUUID()}.pdf`;
  const { data, error } = await supabase.storage.from(PDF_BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return { ok: false, error: `Falha a preparar upload: ${error?.message ?? 'desconhecido'}` };
  }
  return { ok: true, path: data.path, token: data.token };
}

export async function createLessonAction(formData: FormData): Promise<CreateLessonResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode criar aulas.' };
  }

  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;
  const moduleId = validateUuid(formData.get('module_id'), 'module_id');
  if (!moduleId.ok) return moduleId;
  const title = validateTitle(formData.get('title'));
  if (!title.ok) return title;
  const description = validateOptionalText(
    formData.get('description'),
    DESCRIPTION_MAX,
    'Descrição',
  );
  if (!description.ok) return description;
  const template = validateTemplate(formData.get('template'));
  if (!template.ok) return template;

  let youtubeUrl: string | null = null;
  if (templateHasVideo(template.value)) {
    const ytResult = validateYoutubeUrl(formData.get('youtube_url'));
    if (!ytResult.ok) return ytResult;
    youtubeUrl = ytResult.value;
  }

  // O PDF já foi enviado pelo browser (upload directo); aqui só chega o path.
  // Templates com sebenta exigem-no; só-vídeo guarda null.
  let pdfStoragePath: string | null = null;
  if (templateHasPdf(template.value)) {
    const validated = validatePdfStoragePath(formData.get('pdf_storage_path'), courseId.value);
    if (!validated.ok) return validated;
    pdfStoragePath = validated.value;
  }

  const supabase = await getServerClient();

  const { data: maxRow, error: maxError } = await supabase
    .from('lessons')
    .select('position')
    .eq('module_id', moduleId.value)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  if (maxError) {
    return { ok: false, error: `Falha a calcular posição: ${maxError.message}` };
  }
  const nextPosition = maxRow ? maxRow.position + 1 : 0;

  // Insert único: o path real (ou null) já é conhecido - sem placeholder nem
  // reconciliação posterior.
  const { data: inserted, error: insertError } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId.value,
      title: title.value,
      description: description.value,
      template: template.value,
      youtube_url: youtubeUrl,
      pdf_storage_path: pdfStoragePath,
      position: nextPosition,
    })
    .select('id')
    .single<{ id: string }>();

  if (insertError || !inserted) {
    // O ficheiro já está no bucket; se a aula não nasceu, remove-o (best-effort)
    // para não deixar órfão.
    if (pdfStoragePath) {
      await supabase.storage.from(PDF_BUCKET).remove([pdfStoragePath]);
    }
    return { ok: false, error: `Falha a criar aula: ${insertError?.message ?? 'sem dados'}` };
  }

  revalidateLessonPages(courseId.value, moduleId.value);
  return { ok: true, id: inserted.id };
}

export async function updateLessonAction(formData: FormData): Promise<LessonActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode alterar aulas.' };
  }

  const id = validateUuid(formData.get('id'), 'id');
  if (!id.ok) return id;
  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;
  const moduleId = validateUuid(formData.get('module_id'), 'module_id');
  if (!moduleId.ok) return moduleId;
  const title = validateTitle(formData.get('title'));
  if (!title.ok) return title;
  const description = validateOptionalText(
    formData.get('description'),
    DESCRIPTION_MAX,
    'Descrição',
  );
  if (!description.ok) return description;
  const template = validateTemplate(formData.get('template'));
  if (!template.ok) return template;

  let youtubeUrl: string | null = null;
  if (templateHasVideo(template.value)) {
    // Coerência: ao escolher um template com vídeo (video ou video_pdf) é
    // obrigatório fornecer URL no mesmo submit, mesmo que o anterior já
    // tivesse vídeo (o admin pode ter alterado o URL).
    const ytResult = validateYoutubeUrl(formData.get('youtube_url'));
    if (!ytResult.ok) return ytResult;
    youtubeUrl = ytResult.value;
  }
  // Se template === 'pdf', youtubeUrl mantém-se null — limpa qualquer URL
  // antigo (regra de coerência → pdf).

  const supabase = await getServerClient();

  // Lê sempre o path actual primeiro: serve para o manter (sem novo PDF) e para
  // limpar o ficheiro antigo (troca para vídeo, ou novo PDF que cria um path
  // diferente - o nome é aleatório, já não reconstruível a partir do id).
  const { data: current, error: lookupError } = await supabase
    .from('lessons')
    .select('pdf_storage_path')
    .eq('id', id.value)
    .maybeSingle<{ pdf_storage_path: string | null }>();
  if (lookupError) {
    return { ok: false, error: `Falha a carregar aula: ${lookupError.message}` };
  }
  if (!current) {
    return { ok: false, error: 'Aula não encontrada.' };
  }
  const currentPath = current.pdf_storage_path;

  // Coerência de sebenta por template:
  //   - video        → sem sebenta: pdf_storage_path = null (ficheiro antigo
  //     removido best-effort após o update).
  //   - pdf|video_pdf → novo path enviado (upload directo) substitui o actual;
  //     senão mantém-no. Se a aula vinha de 'video' (sem sebenta), exige PDF.
  const newPathRaw = formData.get('pdf_storage_path');
  const hasNewPdf = typeof newPathRaw === 'string' && newPathRaw.length > 0;

  let pdfStoragePath: string | null;
  let orphanToRemove: string | null = null;
  if (!templateHasPdf(template.value)) {
    pdfStoragePath = null;
    orphanToRemove = currentPath;
  } else if (hasNewPdf) {
    const validated = validatePdfStoragePath(newPathRaw, courseId.value);
    if (!validated.ok) return validated;
    pdfStoragePath = validated.value;
    if (currentPath && currentPath !== pdfStoragePath) orphanToRemove = currentPath;
  } else {
    if (!currentPath) {
      return { ok: false, error: 'Esta aula passou a ter sebenta - anexa um PDF.' };
    }
    pdfStoragePath = currentPath;
  }

  const { error: updateError } = await supabase
    .from('lessons')
    .update({
      title: title.value,
      description: description.value,
      template: template.value,
      youtube_url: youtubeUrl,
      pdf_storage_path: pdfStoragePath,
    })
    .eq('id', id.value);

  if (updateError) {
    return { ok: false, error: `Falha a atualizar aula: ${updateError.message}` };
  }

  // Remove o ficheiro antigo que deixou de ser referenciado (best-effort,
  // pós-update; se falhar fica órfão até limpeza manual).
  if (orphanToRemove) {
    await supabase.storage.from(PDF_BUCKET).remove([orphanToRemove]);
  }

  revalidateLessonPages(courseId.value, moduleId.value);
  return { ok: true };
}

export async function deleteLessonAction(formData: FormData): Promise<LessonActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode apagar aulas.' };
  }

  const id = validateUuid(formData.get('id'), 'id');
  if (!id.ok) return id;
  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;
  const moduleId = validateUuid(formData.get('module_id'), 'module_id');
  if (!moduleId.ok) return moduleId;

  const supabase = await getServerClient();

  // Lê o path antes de apagar — o nome do ficheiro é aleatório, já não é
  // reconstruível a partir do id.
  const { data: row } = await supabase
    .from('lessons')
    .select('pdf_storage_path')
    .eq('id', id.value)
    .maybeSingle<{ pdf_storage_path: string | null }>();

  const { error } = await supabase.from('lessons').delete().eq('id', id.value);

  if (error) {
    return { ok: false, error: `Falha a apagar aula: ${error.message}` };
  }

  // Apaga também o PDF do bucket (best-effort — se falhar, o registo já
  // desapareceu, e o ficheiro fica órfão até limpeza manual). Decisão V3:
  // não bloquear em erro de storage.
  if (row?.pdf_storage_path) {
    await supabase.storage.from(PDF_BUCKET).remove([row.pdf_storage_path]);
  }

  revalidateLessonPages(courseId.value, moduleId.value);
  return { ok: true };
}

type Direction = 'up' | 'down';

async function moveLesson(formData: FormData, direction: Direction): Promise<LessonActionResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode reordenar aulas.' };
  }

  const id = validateUuid(formData.get('id'), 'id');
  if (!id.ok) return id;
  const courseId = validateUuid(formData.get('course_id'), 'course_id');
  if (!courseId.ok) return courseId;
  const moduleId = validateUuid(formData.get('module_id'), 'module_id');
  if (!moduleId.ok) return moduleId;

  const supabase = await getServerClient();

  const { data: current, error: currentError } = await supabase
    .from('lessons')
    .select('id, position, module_id')
    .eq('id', id.value)
    .maybeSingle<{ id: string; position: number; module_id: string }>();

  if (currentError) {
    return { ok: false, error: `Falha a carregar aula: ${currentError.message}` };
  }
  if (!current) {
    return { ok: false, error: 'Aula não encontrada.' };
  }
  if (current.module_id !== moduleId.value) {
    return { ok: false, error: 'A aula não pertence ao módulo indicado.' };
  }

  const neighborQuery = supabase
    .from('lessons')
    .select('id, position')
    .eq('module_id', moduleId.value);
  const { data: neighbor, error: neighborError } = await (
    direction === 'up'
      ? neighborQuery.lt('position', current.position).order('position', { ascending: false })
      : neighborQuery.gt('position', current.position).order('position', { ascending: true })
  )
    .limit(1)
    .maybeSingle<{ id: string; position: number }>();

  if (neighborError) {
    return { ok: false, error: `Falha a carregar vizinho: ${neighborError.message}` };
  }
  if (!neighbor) {
    return { ok: true };
  }

  const { error: updateCurrentError } = await supabase
    .from('lessons')
    .update({ position: neighbor.position })
    .eq('id', current.id);
  if (updateCurrentError) {
    return { ok: false, error: `Falha a mover aula: ${updateCurrentError.message}` };
  }

  const { error: updateNeighborError } = await supabase
    .from('lessons')
    .update({ position: current.position })
    .eq('id', neighbor.id);
  if (updateNeighborError) {
    return { ok: false, error: `Falha a mover vizinho: ${updateNeighborError.message}` };
  }

  revalidateLessonPages(courseId.value, moduleId.value);
  return { ok: true };
}

export async function moveLessonUpAction(formData: FormData): Promise<LessonActionResult> {
  return moveLesson(formData, 'up');
}

export async function moveLessonDownAction(formData: FormData): Promise<LessonActionResult> {
  return moveLesson(formData, 'down');
}
