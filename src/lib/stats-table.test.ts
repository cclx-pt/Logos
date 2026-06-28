import { describe, it, expect } from 'vitest';

import { filterAndSortStatRows, type StatRow } from './stats-table';

const rows: StatRow[] = [
  { id: 'a', search: 'ana user', cells: { nome: 'Ana', inscritos: 3 } },
  { id: 'b', search: 'bruno admin', cells: { nome: 'Bruno', inscritos: 1 } },
  { id: 'c', search: 'carlos user', cells: { nome: 'Carlos', inscritos: 10 } },
];

const numeric = new Set(['inscritos']);

describe('filterAndSortStatRows', () => {
  it('filtra por substring em search (case-insensitive)', () => {
    const out = filterAndSortStatRows(rows, 'admin', 'nome', 'asc', numeric);
    expect(out.map((r) => r.id)).toEqual(['b']);
  });

  it('sem query devolve todas as linhas', () => {
    const out = filterAndSortStatRows(rows, '   ', 'nome', 'asc', numeric);
    expect(out).toHaveLength(3);
  });

  it('ordena numericamente asc e desc', () => {
    expect(
      filterAndSortStatRows(rows, '', 'inscritos', 'asc', numeric).map((r) => r.cells.inscritos),
    ).toEqual([1, 3, 10]);
    expect(
      filterAndSortStatRows(rows, '', 'inscritos', 'desc', numeric).map((r) => r.cells.inscritos),
    ).toEqual([10, 3, 1]);
  });

  it('ordena strings em pt asc e desc', () => {
    expect(
      filterAndSortStatRows(rows, '', 'nome', 'asc', numeric).map((r) => r.cells.nome),
    ).toEqual(['Ana', 'Bruno', 'Carlos']);
    expect(
      filterAndSortStatRows(rows, '', 'nome', 'desc', numeric).map((r) => r.cells.nome),
    ).toEqual(['Carlos', 'Bruno', 'Ana']);
  });

  it('não muta o array de entrada', () => {
    const snapshot = rows.map((r) => r.id);
    filterAndSortStatRows(rows, '', 'inscritos', 'desc', numeric);
    expect(rows.map((r) => r.id)).toEqual(snapshot);
  });
});
