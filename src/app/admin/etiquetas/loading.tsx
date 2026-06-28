import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton de `/admin/etiquetas`. Reflecte header + form de criar +
 * tabela de etiquetas existentes (4 colunas: Nome, Slug, Criada em,
 * Ações).
 */
export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>

      <section className="border-border bg-card space-y-4 rounded-lg border p-5">
        <Skeleton className="h-4 w-32" />
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-24" />
        </div>
      </section>

      <section className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <div className="border-border overflow-hidden rounded-lg border">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border flex items-start gap-4 border-t p-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-1/4" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="ml-auto h-5 w-28" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
