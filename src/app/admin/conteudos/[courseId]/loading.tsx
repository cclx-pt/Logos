import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de detalhe do curso (drill-down). Mantém o esqueleto
 * de 3 colunas (conteúdo + Cursos + Estrutura) para minimizar layout shift
 * quando a página real chega.
 */
export default function Loading() {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-10">
        <Skeleton className="h-4 w-40 md:hidden" />

        <header className="space-y-2">
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-full max-w-prose" />
        </header>

        <section className="space-y-4">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="border-border h-40 w-full rounded-lg border" />
          <Skeleton className="h-5 w-48" />
          <div className="border-border space-y-0 rounded-lg border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-border flex items-start gap-4 p-4 last:border-0 [&:not(:last-child)]:border-b"
              >
                <Skeleton className="h-5 w-6" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </section>
      </div>

      <aside className="hidden w-56 shrink-0 md:block">
        <Skeleton className="border-border h-72 w-full rounded-lg border" />
      </aside>
      <aside className="hidden w-60 shrink-0 xl:block">
        <Skeleton className="border-border h-96 w-full rounded-lg border" />
      </aside>
    </div>
  );
}
