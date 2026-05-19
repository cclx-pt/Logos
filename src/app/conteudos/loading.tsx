import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton do catálogo público `/conteudos`. Reflecte o layout da página
 * (intro + form + grid de 6 cards) para minimizar layout shift.
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <Skeleton className="h-12 w-44" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-4 w-full max-w-3xl" />
        <Skeleton className="h-4 w-full max-w-3xl" />
        <Skeleton className="h-4 w-3/4 max-w-2xl" />
      </div>

      <div className="mt-12 flex flex-wrap gap-3">
        <Skeleton className="h-11 min-w-[240px] flex-1" />
        <Skeleton className="h-11 w-28" />
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-7 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
            <Skeleton className="mt-auto h-4 w-24" />
          </li>
        ))}
      </ul>
    </section>
  );
}
