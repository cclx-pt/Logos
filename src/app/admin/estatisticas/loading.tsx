import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton de `/admin/estatisticas` enquanto o Server Component agrega as
 * contagens das 6 tabelas.
 */
export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-96" />
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>

      <section className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <div className="border-border overflow-hidden rounded-lg border">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border flex gap-4 border-t p-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="ml-auto h-5 w-12" />
              <Skeleton className="h-5 w-12" />
              <Skeleton className="h-5 w-12" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
