/**
 * Validators partilhados entre as Server Actions de cursos/módulos/aulas.
 *
 * Vivem em `_lib/` (prefixo underscore = pasta ignorada pelo router do
 * App Router) porque são privados a `admin/conteudos`. Se algum
 * validator subir em reuso (ex.: títulos em etiquetas), promove para
 * `src/lib/forms.ts`.
 *
 * Os limites (TITLE_MAX, DESCRIPTION_MAX) ficam exportados para que cada
 * action documente o que aceita sem ter de re-declarar números mágicos.
 */

import { UUID_RE } from '@/lib/validation';

export type Ok<T> = { ok: true; value: T };
export type Err = { ok: false; error: string };

export const TITLE_MIN = 1;
export const TITLE_MAX = 120;
export const DESCRIPTION_MAX = 4000;

/**
 * Limite de tamanho da apostila PDF. Alinhado com o `file_size_limit` do bucket
 * `lesson-pdfs` (storage.buckets, migration de PR2). Quem o faz cumprir de facto
 * é a Storage do Supabase no upload directo (browser -> bucket); este valor só
 * serve para feedback imediato no browser antes de iniciar o upload.
 */
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

// Cauda esperada do caminho do PDF: `<uuid>.pdf` (nome aleatório gerado ao
// assinar o upload). O prefixo `<courseId>/` é validado à parte.
const PDF_PATH_TAIL_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/i;

/**
 * Valida o caminho de Storage do PDF: tem de ser exactamente
 * `<courseId>/<uuid>.pdf`, com o prefixo igual ao curso da aula. É importante
 * por coerência com a policy RLS `lesson_pdfs_select_visible`, que extrai o
 * courseId do path (`split_part(name, '/', 1)`) para decidir visibilidade - um
 * path com outro prefixo escaparia a essa fronteira. Como o caminho chega do
 * cliente (a Server Action já não recebe o ficheiro), validamo-lo aqui.
 */
export function validatePdfStoragePath(raw: unknown, courseId: string): Ok<string> | Err {
  if (typeof raw !== 'string') return { ok: false, error: 'Caminho do PDF inválido.' };
  const prefix = `${courseId}/`;
  if (!raw.startsWith(prefix) || !PDF_PATH_TAIL_RE.test(raw.slice(prefix.length))) {
    return { ok: false, error: 'Caminho do PDF inválido.' };
  }
  return { ok: true, value: raw };
}

/**
 * Limite e MIME do banner. Alinhados com o bucket `course-banners`
 * (file_size_limit 5 MB, allowed_mime_types) - quem os faz cumprir no upload
 * directo é a Storage; estes valores servem para feedback imediato no browser.
 */
export const MAX_BANNER_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_BANNER_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Caminho de Storage do banner: tem de ser exactamente `<courseId>/banner`
 * (path determinístico; o bucket faz upsert no mesmo sítio). Igual ao
 * `validatePdfStoragePath`, é importante por coerência com a policy RLS
 * `course_banners_select_visible`, que extrai o courseId do path.
 */
export function validateBannerStoragePath(raw: unknown, courseId: string): Ok<string> | Err {
  if (typeof raw !== 'string' || raw !== `${courseId}/banner`) {
    return { ok: false, error: 'Caminho do banner inválido.' };
  }
  return { ok: true, value: raw };
}

export function validateUuid(raw: unknown, fieldName: string): Ok<string> | Err {
  if (typeof raw !== 'string' || !UUID_RE.test(raw)) {
    return { ok: false, error: `${fieldName} inválido.` };
  }
  return { ok: true, value: raw };
}

export function validateTitle(raw: unknown): Ok<string> | Err {
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

export function validateOptionalText(
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
