'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navItems } from '@/lib/site-config';
import { cn } from '@/lib/utils';

type NavLinksProps = {
  /** Orientação do agrupamento. `horizontal` é o default (cabeçalho desktop). */
  orientation?: 'horizontal' | 'vertical';
  /** Callback opcional disparado ao clicar — útil para fechar o menu mobile. */
  onNavigate?: () => void;
  className?: string;
};

export function NavLinks({ orientation = 'horizontal', onNavigate, className }: NavLinksProps) {
  const pathname = usePathname();

  return (
    <ul
      className={cn(
        'flex',
        orientation === 'horizontal' ? 'items-center gap-6 lg:gap-8' : 'flex-col items-start gap-1',
        className,
      )}
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
        return (
          <li key={item.href} className={orientation === 'vertical' ? 'w-full' : undefined}>
            <Link
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              onClick={onNavigate}
              className={cn(
                'focus-visible:ring-ring rounded-sm font-sans transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                orientation === 'vertical'
                  ? 'block w-full px-2 py-3 text-lg'
                  : 'inline-block py-2 text-sm',
                isActive
                  ? 'text-orange underline decoration-2 underline-offset-8'
                  : 'text-ink hover:text-orange-hover',
              )}
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
