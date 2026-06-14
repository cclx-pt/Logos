'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, LayoutGroup } from 'motion/react';
import { useId } from 'react';
import { navItems, type NavItem } from '@/lib/site-config';
import { cn } from '@/lib/utils';

type NavLinksProps = {
  /** Orientação do agrupamento. `horizontal` é o default (cabeçalho desktop). */
  orientation?: 'horizontal' | 'vertical';
  /** Callback opcional disparado ao clicar — útil para fechar o menu mobile. */
  onNavigate?: () => void;
  /** Subconjunto de itens a renderizar. Default: todos (`navItems`). */
  items?: readonly NavItem[];
  className?: string;
};

export function NavLinks({
  orientation = 'horizontal',
  onNavigate,
  items = navItems,
  className,
}: NavLinksProps) {
  const pathname = usePathname();
  const layoutId = useId();

  return (
    <LayoutGroup id={layoutId}>
      <ul
        className={cn(
          'flex',
          orientation === 'horizontal'
            ? 'items-center gap-6 lg:gap-8'
            : 'flex-col items-start gap-1',
          className,
        )}
      >
        {items.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href} className={orientation === 'vertical' ? 'w-full' : undefined}>
              <Link
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                onClick={onNavigate}
                className={cn(
                  'focus-visible:ring-ring relative rounded-sm font-sans transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                  orientation === 'vertical'
                    ? 'block w-full px-2 py-3 text-lg'
                    : 'inline-block py-2 text-sm',
                  isActive ? 'text-orange' : 'text-ink hover:text-orange-hover',
                )}
              >
                {item.label}
                {isActive && (
                  <motion.span
                    layoutId="nav-active-indicator"
                    aria-hidden="true"
                    className={cn(
                      'bg-orange absolute rounded-full',
                      orientation === 'horizontal'
                        ? 'right-0 -bottom-0.5 left-0 h-0.5'
                        : 'top-0 bottom-0 left-0 w-0.5',
                    )}
                    transition={{
                      type: 'spring',
                      stiffness: 380,
                      damping: 32,
                      mass: 0.6,
                    }}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </LayoutGroup>
  );
}
