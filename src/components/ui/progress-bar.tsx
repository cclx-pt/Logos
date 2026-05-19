import { cn } from '@/lib/utils';

type ProgressBarProps = {
  className?: string;
  /** Texto sr-only que descreve o que está em progresso. Default "Em progresso". */
  label?: string;
};

/**
 * ProgressBar indeterminada — animação que viaja da esquerda para a direita,
 * sem valor concreto. Usado em casos onde temos uma operação em curso mas
 * não conseguimos calcular o progresso real (ex.: upload via Server Action
 * com FormData — não há stream observable a partir do cliente).
 *
 * Acessibilidade: `role="progressbar"` sem `aria-valuenow` (Pattern
 * recomendado pela WAI-ARIA para indeterminadas).
 */
export function ProgressBar({ className, label = 'Em progresso' }: ProgressBarProps) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className={cn('bg-muted/60 relative h-1.5 w-full overflow-hidden rounded-full', className)}
    >
      <span className="bg-orange-primary absolute inset-y-0 -left-1/3 w-1/3 animate-[indeterminate_1.5s_ease-in-out_infinite] rounded-full" />
    </div>
  );
}
