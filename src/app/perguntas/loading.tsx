import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da lista "as minhas conversas".
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <ul className="mt-8 space-y-3">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Skeleton className="h-28 w-full rounded-2xl" />
          </li>
        ))}
      </ul>
    </section>
  );
}
