import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da conversa do aluno. Reflete cabeçalho + bolhas + composer.
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 sm:py-16">
      <Skeleton className="h-4 w-40" />

      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-24 w-3/4 rounded-2xl" />
        </div>
        <Skeleton className="h-20 w-3/4 rounded-2xl" />
      </div>

      <Skeleton className="h-44 w-full rounded-2xl" />
    </section>
  );
}
