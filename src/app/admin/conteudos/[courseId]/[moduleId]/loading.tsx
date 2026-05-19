import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de aulas de um módulo (drill-down). Mantém o esqueleto
 * de 2 colunas (conteúdo + Estrutura) para minimizar layout shift quando a
 * página real chega — esta página tem várias queries Supabase
 * (course + module + lessons + CourseTree) e o upload de PDF é lento.
 */
export default function Loading() {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-10">
        <Skeleton className="h-4 w-48 md:hidden" />

        <header className="space-y-2">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-9 w-2/3 max-w-md" />
        </header>

        <section className="space-y-4">
          <Skeleton className="h-7 w-36" />
          <Skeleton className="h-4 w-full max-w-prose" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-3/4" />
            <div className="flex justify-end">
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <Skeleton className="h-7 w-48" />
          <div className="border-border space-y-0 overflow-hidden rounded-lg border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="border-border flex items-start gap-4 p-4 last:border-0 [&:not(:last-child)]:border-b"
              >
                <Skeleton className="h-5 w-6" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="hidden w-60 shrink-0 xl:block">
        <Skeleton className="border-border h-96 w-full rounded-lg border" />
      </aside>
    </div>
  );
}
