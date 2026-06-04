'use client';

import { signInWithGoogleAction, signInWithMicrosoftAction } from '@/lib/auth/actions';
import { cn } from '@/lib/utils';

type ProviderSignInProps = {
  /** Para onde voltar após o login (vai como `?next=` no callback). */
  next?: string;
  /** Tamanho dos botões. */
  size?: 'md' | 'lg';
  className?: string;
};

const BASE =
  'focus-visible:ring-ring inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none';

/**
 * Par de botões de início de sessão (Google + Microsoft).
 *
 * Um único `<form>` com um `next` partilhado; cada botão usa `formAction`
 * para escolher o provider. Sem logótipos de marca (lucide não os fornece e
 * evitamos manutenção/licenciamento de SVGs de marca) — o contexto à volta
 * explica o "porquê".
 */
export function ProviderSignIn({ next, size = 'md', className }: ProviderSignInProps) {
  const sizeClass = size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-sm';
  return (
    <form className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <button
        type="submit"
        formAction={signInWithGoogleAction}
        className={cn(BASE, sizeClass, 'bg-orange-primary hover:bg-orange-hover text-white')}
      >
        Continuar com Google
      </button>
      <button
        type="submit"
        formAction={signInWithMicrosoftAction}
        className={cn(
          BASE,
          sizeClass,
          'border-border text-ink hover:border-orange border bg-transparent',
        )}
      >
        Continuar com Microsoft
      </button>
    </form>
  );
}
