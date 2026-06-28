import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton de `/perfil`. Reflecte avatar + nome + papel + grid 2x2
 * (Nome, Email, Papel, Criada em). Página faz `auth.getUser()` que pode
 * ser lento em cold start.
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <header className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
        <div className="space-y-2 text-center sm:text-left">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-24" />
        </div>
      </header>

      <div className="border-border bg-border mt-12 grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-background space-y-2 px-5 py-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>

      <Skeleton className="mt-10 h-4 w-full max-w-prose" />
    </section>
  );
}
