import { cn } from '@/lib/utils';

type LiveBadgeProps = {
  live: boolean;
  className?: string;
};

/**
 * Badge de estado da transmissão (spec §6.2).
 *  - Ao vivo: vermelho YouTube (#FF0000), ponto branco a pulsar.
 *  - Offline: cinzento neutro, ponto estático.
 *
 * O texto ("Ao vivo"/"Offline") garante que o estado não depende só da cor
 * (acessibilidade). A animação respeita `prefers-reduced-motion` (ver
 * `globals.css`, classe `animate-live-pulse`).
 */
export function LiveBadge({ live, className }: LiveBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[11px] font-medium',
        live ? 'text-white' : 'bg-muted/20 text-muted',
        className,
      )}
      style={live ? { backgroundColor: '#FF0000' } : undefined}
    >
      <span
        aria-hidden="true"
        className={cn(
          'h-[7px] w-[7px] rounded-full',
          live ? 'animate-live-pulse bg-white' : 'bg-muted',
        )}
      />
      {live ? 'Ao vivo' : 'Offline'}
    </span>
  );
}
