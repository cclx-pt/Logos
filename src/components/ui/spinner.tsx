import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type SpinnerProps = {
  className?: string;
  /** Rótulo só-para-leitores. Default "A carregar…". */
  label?: string;
};

/**
 * Spinner — símbolo de loading reutilizável. Usa `Loader2` do Lucide com
 * `animate-spin` do Tailwind (rotação contínua). Server-renderable; nenhum
 * estado interno.
 *
 * Acessibilidade: `role="status"` + texto sr-only para leitores de ecrã. O
 * SVG é decorativo (`aria-hidden`).
 */
export function Spinner({ className, label = 'A carregar…' }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center', className)}>
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
