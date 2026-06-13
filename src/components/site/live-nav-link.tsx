'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLiveStatus } from '@/lib/youtube/use-live-status';
import { cn } from '@/lib/utils';
import { LiveBadge } from './live-badge';

type LiveNavLinkProps = {
  orientation?: 'horizontal' | 'vertical';
  onNavigate?: () => void;
  className?: string;
};

const HREF = '/live';
const LABEL = 'Live';

/**
 * Entrada de navegação "Live" (spec §6.1), com 3 estados:
 *  - Ao vivo: clicável → `/live`, badge "Ao vivo".
 *  - Offline: visível, cinzento, badge "Offline", não clicável (`aria-disabled`,
 *    fora do tab order).
 *  - A carregar: cinzento, sem badge, não clicável.
 *
 * O estado vem do polling a `/api/youtube/live-status` (60s). Render à parte
 * de `NavLinks` por ser dinâmico (estado live) e ter um item desativável.
 */
export function LiveNavLink({
  orientation = 'horizontal',
  onNavigate,
  className,
}: LiveNavLinkProps) {
  const pathname = usePathname();
  const { status, loading } = useLiveStatus();
  const live = status?.live === true;

  const isActive = pathname === HREF || pathname.startsWith(`${HREF}/`);

  const baseLayout =
    orientation === 'vertical'
      ? 'flex w-full items-center justify-between gap-2 px-2 py-3 text-lg'
      : 'inline-flex items-center gap-2 py-2 text-sm';

  const content = (
    <>
      <span>{LABEL}</span>
      {!loading && <LiveBadge live={live} />}
    </>
  );

  if (live) {
    return (
      <Link
        href={HREF}
        aria-current={isActive ? 'page' : undefined}
        onClick={onNavigate}
        className={cn(
          'focus-visible:ring-ring rounded-sm font-sans transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
          baseLayout,
          isActive ? 'text-orange' : 'text-ink hover:text-orange-hover',
          className,
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      aria-disabled="true"
      aria-label={loading ? `${LABEL} (a carregar)` : `${LABEL} (offline)`}
      className={cn(
        'cursor-not-allowed font-sans text-muted select-none',
        baseLayout,
        className,
      )}
    >
      {content}
    </span>
  );
}
