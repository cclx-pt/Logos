'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  /** Rótulo da região de scroll, lido por leitores de ecrã. Ex.: "Tabela de utilizadores". */
  label: string;
  /** A `<table>` (ou qualquer conteúdo largo). */
  children: ReactNode;
  className?: string;
};

/**
 * TableScroll — moldura das tabelas do admin com **scroll horizontal**.
 *
 * As tabelas do admin têm até 7 colunas. O contentor de antes era
 * `overflow-hidden`: quando a largura mínima da tabela passava a do ecrã
 * (sempre, em telemóvel), as colunas da direita eram **cortadas e ficavam
 * inalcançáveis** - não havia sequer scroll. Era isso que escondia o
 * "Promover a admin" em `/admin/utilizadores` e as colunas de números em
 * `/admin/estatisticas`.
 *
 * O que resolve o problema é só CSS (`overflow-x-auto`), por isso funciona
 * sem JavaScript. O resto é melhoria progressiva, depois da hidratação:
 *
 *   - `role="region"` + `tabIndex` só quando há mesmo o que deslizar - uma
 *     região focável permite dar scroll com o teclado (WCAG 2.1.1); pô-la
 *     sempre no DOM só acrescentava paragens de tab inúteis.
 *   - dica visível em baixo, para ninguém ficar a pensar que faltam colunas.
 *
 * O `ResizeObserver` vigia o contentor **e** a tabela: a largura do ecrã muda
 * (rodar o telemóvel) e a da tabela também (o `ListSearch` esconde linhas, o
 * que encolhe as colunas).
 */
export function TableScroll({ label, children, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // 1px de folga: `scrollWidth`/`clientWidth` arredondam para inteiro e um
    // subpixel de diferença não é scroll real.
    const check = () => setScrollable(el.scrollWidth > el.clientWidth + 1);
    check();

    const observer = new ResizeObserver(check);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div>
      <div
        ref={ref}
        {...(scrollable ? { role: 'region', 'aria-label': label, tabIndex: 0 } : {})}
        className={cn(
          'border-border focus-visible:ring-ring overflow-x-auto rounded-lg border focus-visible:ring-2 focus-visible:outline-none',
          className,
        )}
      >
        {children}
      </div>
      {scrollable ? (
        <p className="text-muted-foreground mt-2 text-xs">
          Desliza a tabela para o lado para veres todas as colunas.
        </p>
      ) : null}
    </div>
  );
}
