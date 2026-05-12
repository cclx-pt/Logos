import Link from 'next/link';
import { BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  /** Tamanho do wordmark. Defaults a "md" (header). */
  size?: 'sm' | 'md' | 'lg';
  /** Se `true`, renderiza sem `<Link>` (útil no rodapé ou em hero). */
  asStatic?: boolean;
};

const sizeMap = {
  sm: { icon: 'h-5 w-5', text: 'text-lg', gap: 'gap-1.5' },
  md: { icon: 'h-7 w-7', text: 'text-2xl', gap: 'gap-2' },
  lg: { icon: 'h-12 w-12', text: 'text-5xl sm:text-6xl', gap: 'gap-3 sm:gap-4' },
} as const;

export function Logo({ className, size = 'md', asStatic = false }: LogoProps) {
  const s = sizeMap[size];
  const content = (
    <span
      className={cn(
        'text-orange inline-flex items-center font-medium tracking-[0.18em]',
        s.gap,
        className,
      )}
    >
      <BookOpen className={s.icon} strokeWidth={1.5} aria-hidden="true" />
      <span className={cn('font-display', s.text)}>LOGOS</span>
    </span>
  );

  if (asStatic) {
    return <span aria-label="Logos">{content}</span>;
  }

  return (
    <Link
      href="/"
      aria-label="Logos — voltar à página inicial"
      className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
