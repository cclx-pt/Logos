'use server';

/**
 * Server Actions para acesso a conteúdo de cursos.
 *
 * 1. `getLessonPdfSignedUrlAction` (PR6): gera URL assinada de 5 minutos
 *    para o PDF da aula. Defesa em profundidade em duas camadas:
 *      - RLS em `lessons` filtra visibilidade ao nível da DB; se o select
 *        devolver nada, recusamos antes de tocar em Storage.
 *      - RLS em `storage.objects` (policy `lesson_pdfs_select_visible`)
 *        filtra visibilidade ao nível do bucket via path parsing
 *        (`<courseId>/<lessonId>.pdf` → `course_is_visible(courses)`), o
 *        que fecha o canal directo cliente → Storage. Esta Server Action
 *        mantém-se como ponto único de signing por ergonomia, não por
 *        ser a fronteira de segurança.
 *
 * 2. `logCourseAccessAction` (PR8): regista clique em "Começar/Continuar
 *    curso" na tabela `course_access_log`. INSERT só do próprio (RLS de
 *    PR2). Falha no insert não é fatal para o utilizador — devolvemos
 *    `{ ok: false }` mas a UI redirecciona à mesma para a aula. O
 *    objectivo é ter telemetria leve para o admin (não bloquear).
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';

const SIGNED_URL_TTL_SECONDS = 300;

export type SignedUrlResult = { ok: true; url: string } | { ok: false; error: string };

export async function getLessonPdfSignedUrlAction(lessonId: string): Promise<SignedUrlResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(lessonId)) {
    return { ok: false, error: 'Aula inválida.' };
  }

  const supabase = await getServerClient();

  // RLS faz a filtragem de visibilidade — se a aula não for visível, .maybeSingle()
  // devolve null. Confiamos no helper SQL `course_is_visible` herdado em
  // `lessons_select_visible` (V3 PR2).
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, pdf_storage_path')
    .eq('id', lessonId)
    .maybeSingle<{ id: string; pdf_storage_path: string | null }>();

  if (error) {
    return { ok: false, error: `Falha a carregar aula: ${error.message}` };
  }
  if (!lesson) {
    return { ok: false, error: 'Aula não encontrada ou sem acesso.' };
  }
  // Aulas só-vídeo (template = video) não têm apostila.
  if (!lesson.pdf_storage_path) {
    return { ok: false, error: 'Esta aula não tem apostila.' };
  }

  const { data: signed, error: signedError } = await supabase.storage
    .from('lesson-pdfs')
    .createSignedUrl(lesson.pdf_storage_path, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed) {
    return { ok: false, error: `Falha a gerar URL: ${signedError?.message ?? 'desconhecido'}` };
  }

  return { ok: true, url: signed.signedUrl };
}

export type LogAccessResult = { ok: true } | { ok: false; error: string };

/**
 * Regista uma visita a uma aula em `lesson_views` (V3 pull-forward de V5).
 * Best-effort: chamada por um beacon client no mount da página de aula. Falha
 * (RLS, sessão expirada, aula inexistente) não é fatal — devolve `{ ok: false }`
 * e a página continua a funcionar. Só serve telemetria leve para o admin.
 */
export async function logLessonViewAction(lessonId: string): Promise<LogAccessResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(lessonId)) {
    return { ok: false, error: 'Aula inválida.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('lesson_views')
    .insert({ user_id: caller.id, lesson_id: lessonId });

  if (error) {
    return { ok: false, error: `Falha a registar visita: ${error.message}` };
  }
  return { ok: true };
}

export async function logCourseAccessAction(courseId: string): Promise<LogAccessResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(courseId)) {
    return { ok: false, error: 'Curso inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('course_access_log')
    .insert({ user_id: caller.id, course_id: courseId });

  if (error) {
    return { ok: false, error: `Falha a registar acesso: ${error.message}` };
  }
  return { ok: true };
}
