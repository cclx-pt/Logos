/**
 * Assinatura de URLs para o PDF (sebenta) de uma aula. Núcleo partilhado por:
 *   - a Server Action `getLessonPdfSignedUrlAction` (compat / API estável);
 *   - o route handler `GET /conteudos/[courseId]/[lessonId]/sebenta`, que serve
 *     tanto o visualizador inline (iframe) como o download (`?dl=1`).
 *
 * Defesa em profundidade (inalterada): a RLS de `lessons` filtra visibilidade
 * (helper SQL `course_is_visible`); se o select devolver nada, recusamos antes
 * de tocar em Storage. A RLS de `storage.objects` (`lesson_pdfs_select_visible`)
 * fecha o canal directo cliente → bucket. Este módulo é o ponto único de
 * signing por ergonomia, não por ser a fronteira de segurança.
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';

const SIGNED_URL_TTL_SECONDS = 300;

export type SignedUrlResult =
  | { ok: true; url: string; fileName: string }
  | { ok: false; error: string };

/**
 * Constrói o nome do ficheiro a partir do título da aula. Remove os caracteres
 * ilegais em nomes de ficheiro (`/ \ : * ? " < > |`), colapsa espaços e limita
 * o comprimento; mantém acentos (o route handler codifica-os no Content-Disposition).
 */
function pdfFileNameFromTitle(title: string | null | undefined): string {
  const cleaned = (title ?? '')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${cleaned || 'sebenta'}.pdf`;
}

/**
 * Gera uma URL assinada (5 min) para o PDF da aula, mais o nome de ficheiro
 * sugerido (derivado do título). Assina sempre fresca — é por isso que o iframe
 * e o download passam por aqui a cada pedido em vez de reutilizarem uma URL
 * embebida no HTML que expirava ao fim de 5 min (origem do erro intermitente
 * "sem acesso" no visualizador em mobile).
 */
export async function signLessonPdfUrl(lessonId: string): Promise<SignedUrlResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(lessonId)) {
    return { ok: false, error: 'Aula inválida.' };
  }

  const supabase = await getServerClient();

  // RLS filtra visibilidade — aula invisível → maybeSingle() devolve null.
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id, title, pdf_storage_path')
    .eq('id', lessonId)
    .maybeSingle<{ id: string; title: string; pdf_storage_path: string | null }>();

  if (error) {
    return { ok: false, error: `Falha a carregar aula: ${error.message}` };
  }
  if (!lesson) {
    return { ok: false, error: 'Aula não encontrada ou sem acesso.' };
  }
  // Aulas só-vídeo (template = video) não têm sebenta.
  if (!lesson.pdf_storage_path) {
    return { ok: false, error: 'Esta aula não tem sebenta.' };
  }

  // URL inline (sem download param). O route handler é que decide o que fazer:
  // no modo inline faz 302 para esta URL (o browser mostra o PDF); no modo
  // download serve o ficheiro ele próprio com `Content-Disposition: attachment`
  // (garante o download em qualquer browser, sem depender do redirect/Supabase).
  const { data: signed, error: signedError } = await supabase.storage
    .from('lesson-pdfs')
    .createSignedUrl(lesson.pdf_storage_path, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed) {
    return { ok: false, error: `Falha a gerar URL: ${signedError?.message ?? 'desconhecido'}` };
  }

  return { ok: true, url: signed.signedUrl, fileName: pdfFileNameFromTitle(lesson.title) };
}
