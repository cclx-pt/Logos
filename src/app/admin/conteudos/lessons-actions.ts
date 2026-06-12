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
 *      apostila (pdf|video_pdf) ⇒ pdf_storage_path not null) defendem contra
 *      inputs maliciosos. Migration de 12-06-2026 (V3.4).
 *
 * Coerência de template (V3.4 estende a decisão de 19-05-2026, v3-plan.md §10):
 *   - Templates com vídeo (video, video_pdf) exigem `youtube_url` no mesmo
 *     submit; template `pdf` limpa qualquer URL antigo.
 *   - Templates com apostila (pdf, video_pdf) exigem PDF; `video` (só vídeo)
 *     não tem apostila e guarda `pdf_storage_path = null` (ficheiro removido
 *     best-effort ao migrar de/para esse template).
 *
 * Upload PDF: bucket `lesson-pdfs/<courseId>/<lessonId>.pdf`, MIME
 * application/pdf, tamanho ≤ 20 MB (alinhado com `storage.buckets`
 * file_size_limit em PR2). Se o upload falhar após o insert, faz-se
 * rollback do row para não ficar a apontar para path inexistente.
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
  validateTitle,
  validateUuid,
  type Err,
  type Ok,
} from './_lib/validation';

export type CreateLessonResult = { ok: true; id: string } | { ok: false; error: string };
export type LessonActionResult = { ok: true } | { ok: false; error: string };

const YOUTUBE_RE =
  /^https?:\/\/(?:www\.)?(?:youtu\.be\/[A-Za-z0-9_-]{6,}|youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,})\S*$/i;
const TEMPLATES = ['pdf', 'video', 'video_pdf'] as const;
type Template = (typeof TEMPLATES)[number];
const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB — alinhado com storage.buckets em PR2.

// Coerência template ↔ campos (V3.4): vídeo exige YouTube; só 'video'
// dispensa apostila. Espelha os CHECK em `lessons` (migration de 12-06-2026).
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
 * Valida e faz upload de um PDF para o bucket `lesson-pdfs`. Devolve o
 * caminho relativo ao bucket em caso de sucesso. Isolada em função para
 * separar lógica de Storage da lógica de DB (permite mockar nos testes).
 */
async function uploadLessonPdf(
  file: File,
  courseId: string,
  lessonId: string,
): Promise<Ok<string> | Err> {
  if (file.type !== 'application/pdf') {
    return { ok: false, error: 'Ficheiro tem de ser PDF (application/pdf).' };
  }
  if (file.size === 0) {
    return { ok: false, error: 'Ficheiro PDF está vazio.' };
  }
  if (file.size > MAX_PDF_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return { ok: false, error: `PDF excede 20 MB (tem ${mb} MB).` };
  }

  const supabase = await getServerClient();
  const path = `${courseId}/${lessonId}.pdf`;
  const { error } = await supabase.storage.from('lesson-pdfs').upload(path, file, {
    upsert: true,
    contentType: 'application/pdf',
  });
  if (error) {
    return { ok: false, error: `Falha a fazer upload do PDF: ${error.message}` };
  }
  return { ok: true, value: path };
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

  const pdfFile = formData.get('pdf');
  const hasPdfFile = pdfFile instanceof File && pdfFile.size > 0;
  if (templateHasPdf(template.value) && !hasPdfFile) {
    return { ok: false, error: 'É obrigatório anexar um PDF.' };
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

  // Só vídeo: sem apostila. Insert directo com pdf_storage_path null - não há
  // upload nem placeholder a reconciliar.
  if (!templateHasPdf(template.value)) {
    const { data: inserted, error: insertError } = await supabase
      .from('lessons')
      .insert({
        module_id: moduleId.value,
        title: title.value,
        description: description.value,
        template: template.value,
        youtube_url: youtubeUrl,
        pdf_storage_path: null,
        position: nextPosition,
      })
      .select('id')
      .single<{ id: string }>();

    if (insertError || !inserted) {
      return { ok: false, error: `Falha a criar aula: ${insertError?.message ?? 'sem dados'}` };
    }

    revalidateLessonPages(courseId.value, moduleId.value);
    return { ok: true, id: inserted.id };
  }

  // pdf | video_pdf: insert com placeholder no `pdf_storage_path` (NOT NULL na DB).
  // Substitui-se pelo path real após upload bem-sucedido. Se o upload falhar,
  // faz-se rollback do row.
  const placeholderPath = `pending-${Date.now()}`;
  const { data: inserted, error: insertError } = await supabase
    .from('lessons')
    .insert({
      module_id: moduleId.value,
      title: title.value,
      description: description.value,
      template: template.value,
      youtube_url: youtubeUrl,
      pdf_storage_path: placeholderPath,
      position: nextPosition,
    })
    .select('id')
    .single<{ id: string }>();

  if (insertError || !inserted) {
    return { ok: false, error: `Falha a criar aula: ${insertError?.message ?? 'sem dados'}` };
  }

  // `hasPdfFile` garantiu acima que isto é um File não vazio.
  const upload = await uploadLessonPdf(pdfFile as File, courseId.value, inserted.id);
  if (!upload.ok) {
    // Rollback — apaga a aula inserida com placeholder para não ficar órfã.
    await supabase.from('lessons').delete().eq('id', inserted.id);
    return upload;
  }

  const { error: pathError } = await supabase
    .from('lessons')
    .update({ pdf_storage_path: upload.value })
    .eq('id', inserted.id);
  if (pathError) {
    return { ok: false, error: `Falha a registar caminho do PDF: ${pathError.message}` };
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

  // Coerência de apostila por template:
  //   - video        → sem apostila: pdf_storage_path = null (ficheiro órfão
  //     removido best-effort após o update).
  //   - pdf|video_pdf → novo File anexado faz upload (upsert); senão mantém o
  //     path actual. Se a aula vinha de 'video' (sem apostila), exige upload.
  const pdfFile = formData.get('pdf');
  const hasNewPdf = pdfFile instanceof File && pdfFile.size > 0;

  let pdfStoragePath: string | null;
  if (!templateHasPdf(template.value)) {
    pdfStoragePath = null;
  } else if (hasNewPdf) {
    const upload = await uploadLessonPdf(pdfFile as File, courseId.value, id.value);
    if (!upload.ok) return upload;
    pdfStoragePath = upload.value;
  } else {
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
    if (!current.pdf_storage_path) {
      return { ok: false, error: 'Esta aula passou a ter apostila - anexa um PDF.' };
    }
    pdfStoragePath = current.pdf_storage_path;
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

  // Só vídeo: a apostila deixou de fazer parte da aula - remove o ficheiro do
  // bucket (best-effort, pós-update; se falhar fica órfão até limpeza manual).
  if (!templateHasPdf(template.value)) {
    await supabase.storage.from('lesson-pdfs').remove([`${courseId.value}/${id.value}.pdf`]);
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
  const { error } = await supabase.from('lessons').delete().eq('id', id.value);

  if (error) {
    return { ok: false, error: `Falha a apagar aula: ${error.message}` };
  }

  // Apaga também o PDF do bucket (best-effort — se falhar, o registo já
  // desapareceu, e o ficheiro fica órfão até limpeza manual). Decisão V3:
  // não bloquear em erro de storage.
  await supabase.storage.from('lesson-pdfs').remove([`${courseId.value}/${id.value}.pdf`]);

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
