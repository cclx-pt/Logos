import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton de `/meus-cursos`. Reflecte o caminho mais comum (autenticado com
 * cursos): título + parágrafo curto + grid de 3 cards. Os caminhos vazios
 * (anónimo / sem cursos) renderizam um bloco grande de uma só vez sem
 * benefício de skeleton.
 */
export default function Loading() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <Skeleton className="h-12 w-64" />
      <div className="mt-8 space-y-2">
        <Skeleton className="h-4 w-full max-w-3xl" />
        <Skeleton className="h-4 w-3/4 max-w-2xl" />
      </div>

      <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="border-border bg-card flex flex-col gap-4 rounded-2xl border p-6">
            <Skeleton className="h-12 w-12 rounded-xl" />
            <Skeleton className="h-7 w-3/4" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="mt-auto h-4 w-24" />
          </li>
        ))}
      </ul>
    </section>
  );
}
