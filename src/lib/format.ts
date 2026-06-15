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

/**
 * Formato data + hora pt-PT: `DD/MM/YYYY, HH:MM`. Usado na vista de conversa de
 * uma pergunta, onde várias mensagens podem cair no mesmo dia e a hora ajuda a
 * ordenar a leitura.
 */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
