'use client';

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';

/**
 * Error boundary global da app. Apanha exceções de render e de Server Actions
 * disparadas a partir de Client Components - ex.: falha ao iniciar OAuth
 * quando o provider ainda não está configurado no Supabase. Sem isto, o
 * utilizador caía na página de erro default do Next ("Application error...")
 * em inglês e sem saída.
 *
 * Client Component por contrato do Next (recebe `reset` para re-renderizar a
 * rota). Sem `motion` deliberadamente: o caminho de erro deve depender do
 * mínimo possível.
 */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32">
      <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">Erro</p>
      <h1 className="font-display text-ink mt-4 text-4xl leading-tight font-medium sm:text-5xl">
        Algo correu mal
      </h1>
      <p className="text-muted-foreground mt-6 max-w-xl font-sans text-base leading-relaxed">
        Aconteceu um erro inesperado da nossa parte. Tenta novamente; se o problema persistir, volta
        ao início e tenta mais tarde.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <button type="button" onClick={reset} className={buttonVariants({ size: 'lg' })}>
          Tentar novamente
        </button>
        <Link href="/" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
          Voltar ao início
        </Link>
      </div>
    </section>
  );
}
