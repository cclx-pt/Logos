import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton de `/admin/utilizadores`. Refletor da tabela de profiles
 * (5 colunas: Nome, Papel, Etiquetas, Criado em, Papel-action). Página
 * faz 3 queries (profiles + tags + user_tags) em paralelo — chega
 * razoavelmente rápido mas vale o aviso visual em ligação lenta.
 */
export default function Loading() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>

      <div className="border-border overflow-hidden rounded-lg border">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-border flex items-start gap-4 border-t p-3">
            <Skeleton className="h-5 w-1/5" />
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="ml-auto h-5 w-28" />
          </div>
        ))}
      </div>
    </div>
  );
}
