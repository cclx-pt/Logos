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

export type SignedUrlResult = { ok: true; url: string } | { ok: false; error: string };

export type SignLessonPdfOptions = {
  /**
   * Quando definido, força `Content-Disposition: attachment` (download em vez
   * de abrir inline). `true` = nome derivado do título da aula; string = nome
   * de ficheiro à medida.
   */
  download?: boolean | string;
};

/**
 * Constrói o nome do ficheiro a partir do título da aula. Remove os caracteres
 * ilegais em nomes de ficheiro (`/ \ : * ? " < > |`), colapsa espaços e limita
 * o comprimento; mantém acentos (os browsers tratam UTF-8 no Content-Disposition).
 */
function pdfFileNameFromTitle(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  return `${cleaned || 'sebenta'}.pdf`;
}

/**
 * Gera uma URL assinada (5 min) para o PDF da aula. Assina sempre fresca — é
 * por isso que o iframe e o botão de download passam por aqui a cada pedido em
 * vez de reutilizarem uma URL embebida no HTML que expirava ao fim de 5 min
 * (origem do erro intermitente "sem acesso" no visualizador em mobile).
 */
export async function signLessonPdfUrl(
  lessonId: string,
  options?: SignLessonPdfOptions,
): Promise<SignedUrlResult> {
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

  const storage = supabase.storage.from('lesson-pdfs');
  // `true` → nome a partir do título; string → nome à medida; falsy → inline.
  const downloadName =
    options?.download === true ? pdfFileNameFromTitle(lesson.title) : options?.download;
  // Só passamos o 3.o argumento quando há download — mantém a chamada de 2
  // argumentos no caminho inline (e o teste que a fixa).
  const { data: signed, error: signedError } = downloadName
    ? await storage.createSignedUrl(lesson.pdf_storage_path, SIGNED_URL_TTL_SECONDS, {
        download: downloadName,
      })
    : await storage.createSignedUrl(lesson.pdf_storage_path, SIGNED_URL_TTL_SECONDS);

  if (signedError || !signed) {
    return { ok: false, error: `Falha a gerar URL: ${signedError?.message ?? 'desconhecido'}` };
  }

  return { ok: true, url: signed.signedUrl };
}
