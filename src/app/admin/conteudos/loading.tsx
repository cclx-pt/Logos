import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da listagem `/admin/conteudos`. Mostra-se enquanto o Server
 * Component da página principal está a fazer fetch a Supabase.
 *
 * Convenção Next.js App Router: cada `loading.tsx` envolve a página
 * irmã num `<Suspense fallback={…}>` automaticamente.
 */
export default function Loading() {
  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-32" />
      </header>

      <section className="space-y-3">
        <Skeleton className="h-4 w-48" />
        <div className="border-border overflow-hidden rounded-lg border">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="border-border flex gap-4 border-t p-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="ml-auto h-5 w-16" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
