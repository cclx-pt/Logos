import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da conversa de uma pergunta. Reflete cabeçalho + bolhas + composer.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Skeleton className="h-4 w-40" />

      <div className="space-y-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-24 w-3/4 rounded-2xl" />
        <div className="flex justify-end">
          <Skeleton className="h-20 w-3/4 rounded-2xl" />
        </div>
      </div>

      <Skeleton className="h-44 w-full rounded-2xl" />
    </div>
  );
}
