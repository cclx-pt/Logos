import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-4 w-48" />
      <header className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-24" />
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-lg" />
        ))}
      </div>
      {Array.from({ length: 2 }).map((_, s) => (
        <section key={s} className="space-y-3">
          <Skeleton className="h-4 w-40" />
          <div className="border-border overflow-hidden rounded-lg border">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="border-border flex gap-4 border-t p-3">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="ml-auto h-5 w-12" />
                <Skeleton className="h-5 w-12" />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
