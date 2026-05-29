'use client';

import { useRouter } from 'next/navigation';
import type { MouseEvent, ReactNode } from 'react';

import { cn } from '@/lib/utils';

type Props = {
  /** Destino da navegação ao clicar na linha. */
  href: string;
  /** Conteúdo da linha (`<td>`s). */
  children: ReactNode;
  /** Texto usado pelo ListSearch para filtrar a linha. */
  searchText?: string;
  className?: string;
};

/**
 * ClickableRow — `<tr>` que navega para `href` quando se clica em qualquer
 * sítio da linha. Mantém-se acessível porque o(s) `<Link>` que existem
 * dentro das células (tipicamente o título) continuam keyboard-focusable.
 *
 * Cliques dentro de elementos interactivos (`<a>`, `<button>`, `<input>`,
 * `<label>`) não desencadeiam a navegação — evita interferir com edição
 * inline e outros controlos.
 */
export function ClickableRow({ href, children, searchText, className }: Props) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLTableRowElement>) {
    const target = event.target as HTMLElement;
    if (target.closest('a, button, input, textarea, select, label')) {
      return;
    }
    router.push(href);
  }

  return (
    <tr
      onClick={handleClick}
      data-search-text={searchText}
      className={cn(
        'text-ink hover:bg-orange-primary/5 cursor-pointer transition-colors',
        className,
      )}
    >
      {children}
    </tr>
  );
}
