import Link from 'next/link';

import { cn } from '@/lib/utils';

type SignInCtaProps = {
  /** Para onde voltar após o login (vai como `?next=` para `/entrar`). */
  next?: string;
  /** Tamanho do botão. */
  size?: 'md' | 'lg';
  /** Texto do botão. Geral por defeito - não menciona nenhum provider. */
  label?: string;
  className?: string;
};

const BASE =
  'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex items-center justify-center rounded-md font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none';

/**
 * CTA de início de sessão para estados anónimos (hero, página de curso,
 * "Os meus cursos"). Liga à página de login geral `/entrar`, que junta os dois
 * métodos (Google + email OTP) - ao contrário do `ProviderSignIn`, que vai
 * direto a um provider e só faz sentido dentro da própria `/entrar`.
 *
 * `<Link>` (com prefetch) é seguro aqui: `/entrar` é uma página normal, não o
 * route handler de OAuth - por isso não há o problema de prefetch que obriga o
 * `ProviderSignIn` a usar `<a>`.
 */
export function SignInCta({ next, size = 'md', label = 'Entrar', className }: SignInCtaProps) {
  const href = next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar';
  const sizeClass = size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-sm';
  return (
    <Link href={href} className={cn(BASE, sizeClass, className)}>
      {label}
    </Link>
  );
}
