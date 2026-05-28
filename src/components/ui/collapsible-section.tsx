import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

type CollapsibleSectionProps = {
  /** Texto do cabeçalho (clicável para colapsar/expandir). */
  title: ReactNode;
  /** Subtítulo opcional abaixo do título (one-liner). */
  subtitle?: ReactNode;
  /** Conteúdo da secção — qualquer JSX. */
  children: ReactNode;
  /** Estado default. `true` = aberto. `false` = fechado (default). */
  defaultOpen?: boolean;
  /** Id usado por `aria-labelledby` da `<section>`. */
  id?: string;
  /** Classe extra aplicada ao container externo. */
  className?: string;
  /** Variante visual — "default" (border-border bg-card) vs "danger" (border-destructive). */
  variant?: 'default' | 'danger';
};

/**
 * CollapsibleSection — wrapper que envolve uma secção da página num
 * `<details>` HTML5 com `<summary>` clicável + chevron rotativo. Zero
 * JavaScript no cliente: o browser cuida do toggle.
 *
 * Pensado para organizar páginas admin densas (Módulos, Detalhes do
 * curso, Zona de perigo, Nova aula, Aulas existentes) — o utilizador
 * colapsa o que não está a usar.
 *
 * Acessibilidade: `<details>` tem suporte nativo a leitores de ecrã
 * (NVDA, VoiceOver, JAWS). Não precisa de `aria-expanded` — o atributo
 * `open` é o source-of-truth.
 *
 * Persistência: não — o estado vive na DOM e reseta em navegação.
 * Aceitável dado que cada página tem ≤ 5 secções; revisitar se a UX
 * exigir.
 */
export function CollapsibleSection({
  title,
  subtitle,
  children,
  defaultOpen = false,
  id,
  className,
  variant = 'default',
}: CollapsibleSectionProps) {
  const headingId = id ? `${id}-heading` : undefined;

  return (
    <details
      open={defaultOpen}
      className={cn(
        'group rounded-lg border p-5 transition-colors',
        variant === 'danger'
          ? 'border-destructive bg-destructive/10 border-2'
          : 'border-border bg-card',
        className,
      )}
    >
      <summary
        className={cn(
          'flex cursor-pointer list-none items-start justify-between gap-4 rounded-md transition-colors outline-none',
          'focus-visible:ring-ring focus-visible:ring-2',
        )}
      >
        <div className="min-w-0 flex-1">
          <h2
            id={headingId}
            className={cn(
              'font-display text-2xl font-medium tracking-tight',
              variant === 'danger' ? 'text-destructive' : 'text-ink',
            )}
          >
            {title}
          </h2>
          {subtitle ? (
            <p className="text-muted-foreground mt-1 max-w-prose text-sm">{subtitle}</p>
          ) : null}
        </div>
        <ChevronDown
          aria-hidden="true"
          className="text-muted-foreground mt-1.5 h-5 w-5 shrink-0 transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-5">{children}</div>
    </details>
  );
}
