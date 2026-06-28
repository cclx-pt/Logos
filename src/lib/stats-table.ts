/**
 * Lógica pura de filtro + ordenação para tabelas de estatísticas do admin.
 * Separada do componente para ser testável e para o componente cliente poder
 * usá-la dentro de `useMemo`/`useDeferredValue` (filtro não-bloqueante → INP
 * saudável mesmo com listas a crescer).
 */

export type SortDir = 'asc' | 'desc';

export type StatColumn = {
  /** Chave em `row.cells`. A primeira coluna é tratada como principal (link). */
  key: string;
  label: string;
  /** Coluna numérica → alinha à direita e ordena numericamente. */
  numeric?: boolean;
  /**
   * Coluna de data: o valor em `cells` é uma string ISO (guardada para ordenar
   * cronologicamente, já que ISO ordena bem como string); a UI mostra-a
   * formatada.
   */
  date?: boolean;
};

export type StatRow = {
  id: string;
  /** Link opcional para a célula da 1ª coluna. */
  href?: string;
  /** Texto (minúsculas) usado pela pesquisa. */
  search: string;
  cells: Record<string, string | number>;
};

/**
 * Filtra por `query` (substring em `row.search`) e ordena por `sortKey`.
 * Numérico para colunas em `numericKeys`, senão comparação de strings (pt).
 * Não muta o array de entrada.
 */
export function filterAndSortStatRows(
  rows: StatRow[],
  query: string,
  sortKey: string,
  sortDir: SortDir,
  numericKeys: ReadonlySet<string>,
): StatRow[] {
  const q = query.trim().toLowerCase();
  const filtered = q === '' ? rows.slice() : rows.filter((r) => r.search.includes(q));

  const isNumeric = numericKeys.has(sortKey);
  filtered.sort((a, b) => {
    const av = a.cells[sortKey];
    const bv = b.cells[sortKey];
    let cmp: number;
    if (isNumeric) {
      cmp = Number(av) - Number(bv);
    } else {
      cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'pt');
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return filtered;
}
