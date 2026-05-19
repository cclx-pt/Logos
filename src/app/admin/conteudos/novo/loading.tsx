import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de novo curso. Layout 2 colunas (form + Cursos
 * column). Reflecte o `CourseForm` real (título + slug + descrição +
 * picker + tags + checkbox de publicado + botões).
 */
export default function Loading() {
  return (
    <div className="flex gap-6">
      <div className="min-w-0 flex-1 space-y-8">
        <Skeleton className="h-4 w-40 md:hidden" />

        <header className="space-y-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-full max-w-prose" />
        </header>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>

          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-16 w-full rounded-md" />

          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-28" />
          </div>
        </div>
      </div>

      <aside className="hidden w-56 shrink-0 md:block">
        <Skeleton className="border-border h-72 w-full rounded-lg border" />
      </aside>
    </div>
  );
}
