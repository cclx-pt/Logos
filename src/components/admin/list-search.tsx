'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Search } from 'lucide-react';

type Props = {
  /**
   * Label do input — fica em `<span class="sr-only">`. Não aparece visualmente
   * mas é lido por screen readers e usado em testes (`getByLabelText`).
   */
  label: string;
  /** Placeholder do input. */
  placeholder?: string;
  /**
   * Wrapper qualquer (tabela, lista, grid). Itens dentro com
   * `data-search-text` são filtrados; o resto fica intocado.
   */
  children: React.ReactNode;
  /** Mensagem quando filtro activo e zero matches. */
  emptyMessage?: string;
  /**
   * Seletor CSS dos itens filtrávies. Por default `[data-search-text]` —
   * cada `<tr>`/`<li>` que queiramos filtrar tem que ter esse atributo.
   */
  itemSelector?: string;
};

/**
 * ListSearch — wrapper Client que adiciona filtro de pesquisa client-side
 * a qualquer listagem renderizada pelo Server Component pai. Não toca no
 * Server-render: usa um `<input>` controlado + DOM ref para esconder
 * descendentes que não batem com a query (via `hidden`).
 *
 * Fallback antes de existir search server-side com paginação (V4). Para já
 * é mais barato — ~200 items aguenta cliente. Acima disso, passa a query
 * param.
 *
 * Uso:
 *   ```tsx
 *   <ListSearch label="Pesquisar curso" placeholder="Título...">
 *     <table>
 *       <tbody>
 *         {rows.map(r => (
 *           <tr key={r.id} data-search-text={r.title.toLowerCase()}>...</tr>
 *         ))}
 *       </tbody>
 *     </table>
 *   </ListSearch>
 *   ```
 */
export function ListSearch({
  label,
  placeholder = 'Pesquisar...',
  children,
  emptyMessage = 'Sem resultados para esta pesquisa.',
  itemSelector = '[data-search-text]',
}: Props) {
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputId = useId();

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const items = container.querySelectorAll<HTMLElement>(itemSelector);
    const q = query.trim().toLowerCase();
    let visible = 0;
    for (const item of items) {
      const text = (item.dataset.searchText ?? '').toLowerCase();
      const matches = q === '' || text.includes(q);
      item.hidden = !matches;
      if (matches) visible++;
    }
    setVisibleCount(visible);
  }, [query, itemSelector, children]);

  const showEmpty = query.trim() !== '' && visibleCount === 0;

  return (
    <div className="space-y-4">
      <label htmlFor={inputId} className="relative block max-w-sm">
        <span className="sr-only">{label}</span>
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        />
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="border-border bg-background text-ink focus-visible:ring-ring h-10 w-full rounded-md border pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>
      <div ref={containerRef}>{children}</div>
      {showEmpty ? (
        <p className="text-muted-foreground text-sm" role="status">
          {emptyMessage}
        </p>
      ) : null}
    </div>
  );
}
