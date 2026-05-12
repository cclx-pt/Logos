import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  /** Tamanho do wordmark. Defaults a "md" (header). */
  size?: 'sm' | 'md' | 'lg';
  /** Se `true`, renderiza sem `<Link>` (útil no rodapé ou em hero). */
  asStatic?: boolean;
};

const sizeMap = {
  sm: 'h-6 w-auto',
  md: 'h-9 w-auto',
  lg: 'h-20 w-auto sm:h-28',
} as const;

export function Logo({ className, size = 'md', asStatic = false }: LogoProps) {
  const content = (
    <Image
      src="/logo-cclx-clean.svg"
      alt=""
      width={1600}
      height={913}
      unoptimized
      priority={size === 'lg'}
      className={cn(sizeMap[size], className)}
    />
  );

  if (asStatic) {
    return (
      <span aria-label="Logos" className="inline-flex items-center">
        {content}
      </span>
    );
  }

  return (
    <Link
      href="/"
      aria-label="Logos — voltar à página inicial"
      className="focus-visible:ring-ring inline-flex items-center rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
