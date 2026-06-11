import { SIGN_IN_PROVIDERS, providerLoginHref } from '@/lib/auth/providers';
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
 * Botões de início de sessão, um por provider de `SIGN_IN_PROVIDERS`.
 *
 * São simples `<a>` para o route handler `/auth/login/<provider>` (que faz o
 * 307 real para o provider) - não Server Actions. O `redirect()` externo numa
 * Server Action invocada pelo cliente rebenta no Next 16 ("Connection closed",
 * 500) - foi o bug do botão "Entrar". Um link normal funciona sempre, com ou
 * sem JS, sem depender de hidratação. Usamos `<a>` (não `<Link>`) de propósito:
 * o prefetch do `<Link>` dispararia o início do OAuth ao passar o rato.
 *
 * O primeiro provider do registry é o primário (sólido laranja); os restantes
 * são outline. Sem logótipos de marca (lucide não os fornece e evitamos
 * manutenção/licenciamento de SVGs de marca) - o contexto à volta explica o
 * "porquê".
 */
export function ProviderSignIn({ next, size = 'md', className }: ProviderSignInProps) {
  const sizeClass = size === 'lg' ? 'h-12 px-6 text-base' : 'h-11 px-5 text-sm';
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', className)}>
      {SIGN_IN_PROVIDERS.map((provider, index) => (
        <a
          key={provider.slug}
          href={providerLoginHref(provider.slug, next)}
          data-next={next}
          className={cn(
            BASE,
            sizeClass,
            index === 0
              ? 'bg-orange-primary hover:bg-orange-hover text-white'
              : 'border-border text-ink hover:border-orange border bg-transparent',
          )}
        >
          Continuar com {provider.label}
        </a>
      ))}
    </div>
  );
}
