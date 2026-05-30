'use client';

import { useDeferredValue, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  filterAndSortStatRows,
  type SortDir,
  type StatColumn,
  type StatRow,
} from '@/lib/stats-table';

type Props = {
  columns: StatColumn[];
  rows: StatRow[];
  /** Coluna inicial de ordenação (default: 1ª coluna). */
  initialSortKey?: string;
  initialSortDir?: SortDir;
  /** Se definido, mostra caixa de pesquisa (filtra por `row.search`). */
  searchLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

/**
 * Tabela de estatísticas com **pesquisa + ordenação** client-side.
 *
 * A pesquisa usa `useDeferredValue` para o filtro não bloquear a escrita
 * (INP saudável mesmo com listas a crescer — fallback até paginação
 * server-side em V4). A 1ª coluna é tratada como principal: alinhada à
 * esquerda e, se a row tiver `href`, renderizada como link. Colunas
 * `numeric` alinham à direita e ordenam numericamente.
 */
export function SortableStatsTable({
  columns,
  rows,
  initialSortKey,
  initialSortDir = 'asc',
  searchLabel,
  searchPlaceholder = 'Pesquisar...',
  emptyMessage = 'Sem resultados para esta pesquisa.',
}: Props) {
  const primaryKey = columns[0]?.key ?? '';
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState(initialSortKey ?? primaryKey);
  const [sortDir, setSortDir] = useState<SortDir>(initialSortDir);
  const inputId = useId();

  const deferredQuery = useDeferredValue(query);
  const numericKeys = useMemo(
    () => new Set(columns.filter((c) => c.numeric).map((c) => c.key)),
    [columns],
  );

  const visible = useMemo(
    () => filterAndSortStatRows(rows, deferredQuery, sortKey, sortDir, numericKeys),
    [rows, deferredQuery, sortKey, sortDir, numericKeys],
  );

  function toggleSort(key: string, numeric: boolean) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Numéricas começam do maior; texto do A→Z.
      setSortDir(numeric ? 'desc' : 'asc');
    }
  }

  return (
    <div className="space-y-4">
      {searchLabel ? (
        <label htmlFor={inputId} className="relative block max-w-sm">
          <span className="sr-only">{searchLabel}</span>
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          />
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="border-border bg-background text-ink focus-visible:ring-ring h-10 w-full rounded-md border pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
      ) : null}

      <div className="border-border overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
            <tr>
              {columns.map((col, i) => {
                const active = col.key === sortKey;
                const Icon = active ? (sortDir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={cn('px-4 py-2 font-medium', i === 0 ? 'text-left' : 'text-right')}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key, col.numeric ?? false)}
                      className={cn(
                        'hover:text-ink focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm uppercase transition-colors focus-visible:ring-2 focus-visible:outline-none',
                        i === 0 ? '' : 'flex-row-reverse',
                        active && 'text-ink',
                      )}
                    >
                      <Icon aria-hidden="true" className="h-3 w-3" />
                      {col.label}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {visible.map((row) => (
              <tr key={row.id} className="text-ink hover:bg-muted/40 transition-colors">
                {columns.map((col, i) => {
                  const value = row.cells[col.key];
                  if (i === 0) {
                    return (
                      <td key={col.key} className="px-4 py-3 font-medium">
                        {row.href ? (
                          <Link
                            href={row.href}
                            className="hover:text-orange-hover focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
                          >
                            {value}
                          </Link>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  }
                  return (
                    <td
                      key={col.key}
                      className={cn(
                        'px-4 py-3',
                        col.numeric ? 'text-right tabular-nums' : 'text-muted-foreground',
                      )}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          {emptyMessage}
        </p>
      ) : null}
    </div>
  );
}
