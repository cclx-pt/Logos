import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type LogoProps = {
  className?: string;
  /** Tamanho do wordmark. Defaults a "md" (header). */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Se `true`, renderiza sem `<Link>` (útil no rodapé ou em hero). */
  asStatic?: boolean;
};

const sizeMap = {
  sm: 'h-6 w-auto',
  md: 'h-9 w-auto',
  lg: 'h-20 w-auto sm:h-28',
  xl: 'h-32 w-auto sm:h-44 md:h-52',
} as const;

export function Logo({ className, size = 'md', asStatic = false }: LogoProps) {
  const content = (
    <Image
      src="/logo-cclx-interiors.svg"
      alt=""
      width={1600}
      height={913}
      unoptimized
      priority={size === 'lg' || size === 'xl'}
      className={cn(sizeMap[size], className)}
    />
  );

  if (asStatic) {
    return (
      <span aria-label="LOGOS" className="inline-flex items-center">
        {content}
      </span>
    );
  }

  return (
    <Link
      href="/"
      aria-label="LOGOS, voltar à página inicial"
      className="focus-visible:ring-ring inline-flex items-center rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
    >
      {content}
    </Link>
  );
}
