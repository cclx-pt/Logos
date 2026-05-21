import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de curso público. Reflecte cabeçalho (ícone + título +
 * descrição), CTA "Começar curso", e lista de módulos colapsáveis.
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-3 w-48" />

      <header className="mt-6 flex flex-col items-start gap-6 sm:flex-row">
        <Skeleton className="h-16 w-16 shrink-0 rounded-2xl" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-9 w-2/3 max-w-md" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <Skeleton className="h-4 w-3/4 max-w-prose" />
        </div>
      </header>

      <Skeleton className="mt-8 h-11 w-40 rounded-md" />

      <section className="mt-12 space-y-4">
        <Skeleton className="h-4 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border-border bg-card rounded-xl border p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-1/2" />
              </div>
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        ))}
      </section>
    </section>
  );
}
