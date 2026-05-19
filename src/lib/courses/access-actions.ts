'use server';

/**
 * Server Actions para acesso a conteúdo de cursos — V3 PR6.
 *
 * 1. `getLessonPdfSignedUrlAction`: gera URL assinada de 5 minutos para o
 *    PDF da aula. Defesa em profundidade: RLS em `lessons` filtra
 *    visibilidade; se o select devolver nada, recusamos. A política de
 *    Storage permite `authenticated` ler qualquer objecto do bucket — a
 *    fronteira fina (saber se este utilizador pode ver este PDF) é feita
 *    aqui antes do `createSignedUrl`.
 *
 * 2. `logCourseAccessAction`: regista clique em "Começar/Continuar curso"
 *    na tabela `course_access_log`. **No-op em PR6** (apenas valida
 *    sessão) — PR8 vai destapar o insert quando a página de stats existir.
 *    Schema já existe.
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
    .maybeSingle<{ id: string; pdf_storage_path: string }>();

  if (error) {
    return { ok: false, error: `Falha a carregar aula: ${error.message}` };
  }
  if (!lesson) {
    return { ok: false, error: 'Aula não encontrada ou sem acesso.' };
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
 * Stub para o access log. PR6 não escreve nada — a UI de stats só existe
 * em PR8. Manter a action como ponto de chamada estável evita ter de
 * tocar nos call sites quando PR8 mergear.
 */
export async function logCourseAccessAction(courseId: string): Promise<LogAccessResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(courseId)) {
    return { ok: false, error: 'Curso inválido.' };
  }
  // PR8: insert em course_access_log aqui.
  return { ok: true };
}
