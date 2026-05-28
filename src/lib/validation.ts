/**
 * Validações partilhadas entre Server Actions, route handlers e pages.
 *
 * Mantém-se como `src/lib/validation.ts` (não `src/lib/auth/` nem
 * `src/lib/courses/`) porque a regra de UUID é canónica em todo o backend
 * Logos — qualquer linha que receba um id do client passa por aqui.
 */

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
