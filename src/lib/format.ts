/**
 * Formatters PT-PT partilhados — datas, números, etc.
 *
 * Mantém-se como `src/lib/format.ts` (top-level, sem subdir) porque os
 * formatters são genéricos. Adicionar aqui em vez de inline em cada page.
 */

/**
 * Formato curto pt-PT: `DD/MM/YYYY`. Usado em listagens admin e cards de
 * curso. Aceita ISO 8601 ou qualquer string que `new Date(...)` entenda.
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
