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
