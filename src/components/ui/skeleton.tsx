import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Skeleton — placeholder visual em pulse usado por `loading.tsx` files e
 * estados de empty-while-loading. Cor derivada de `bg-muted` (cream-bg
 * mais saturado).
 *
 * Acessibilidade: `aria-hidden` por defeito — não deve ser anunciado por
 * leitores de ecrã, que normalmente recebem a página final assim que a
 * resposta server-side chega.
 */
export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn('bg-muted/60 animate-pulse rounded-md', className)}
      {...props}
    />
  );
}
