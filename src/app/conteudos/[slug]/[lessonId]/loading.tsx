import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de aula. Reflecte cabeçalho (módulo + título +
 * descrição), placeholder do vídeo, botão PDF, navegação e índice do curso.
 */
export default function Loading() {
  return (
    <article className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-3 w-64" />

      <header className="mt-6 space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-3/4 max-w-prose" />
      </header>

      <Skeleton className="mt-8 aspect-video w-full rounded-2xl" />

      <Skeleton className="mt-8 h-10 w-48 rounded-md" />

      <div className="border-border mt-12 flex flex-wrap gap-3 border-t pt-6">
        <Skeleton className="h-16 flex-1 rounded-md sm:max-w-[48%]" />
        <Skeleton className="h-16 flex-1 rounded-md sm:max-w-[48%]" />
      </div>

      <section className="mt-16 space-y-6">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="border-border h-24 w-full rounded-lg border" />
        ))}
      </section>
    </article>
  );
}
