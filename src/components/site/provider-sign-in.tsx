'use client';

import { useTransition } from 'react';

import { SIGN_IN_PROVIDERS } from '@/lib/auth/providers';
import { cn } from '@/lib/utils';

type ProviderSignInProps = {
  /** Para onde voltar após o login (vai como `?next=` no callback). */
  next?: string;
  /** Tamanho dos botões. */
  size?: 'md' | 'lg';
  className?: string;
};

const BASE =
  'focus-visible:ring-ring inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70';

/**
 * Botões de início de sessão, um por provider de `SIGN_IN_PROVIDERS`.
 *
 * Cada botão chama a Server Action do provider (que **devolve o URL** do OAuth)
 * e navega com `window.location`. Não usamos `<form action>` com `redirect()`
 * server-side porque o `redirect()` para um URL externo numa Server Action
 * hidratada rebenta no Next 16 ("Connection closed", 500) - ver nota em
 * `src/lib/auth/actions.ts`. Trade-off assumido: o login passa a exigir JS
 * (aceitável - a app inteira já depende de JS para tudo o resto).
 *
 * O primeiro provider do registry é o primário (sólido laranja); os restantes
 * são outline. Sem logótipos de marca (lucide não os fornece e evitamos
 * manutenção/licenciamento de SVGs de marca) - o contexto à volta explica o
 * "porquê". O `next` fica em `data-next` (testável + lido pelo handler).
 */
export function ProviderSignIn({ next, size = 'md', className }: ProviderSignInProps) {
  const [isPending, startTransition] = useTransition();
  const sizeClass = size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-sm';

  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {SIGN_IN_PROVIDERS.map((provider, index) => (
        <button
          key={provider.slug}
          type="button"
          disabled={isPending}
          data-next={next}
          onClick={() =>
            startTransition(async () => {
              const url = await provider.action(next);
              window.location.assign(url);
            })
          }
          className={cn(
            BASE,
            sizeClass,
            index === 0
              ? 'bg-orange-primary hover:bg-orange-hover text-white'
              : 'border-border text-ink hover:border-orange border bg-transparent',
          )}
        >
          Continuar com {provider.label}
        </button>
      ))}
    </div>
  );
}
