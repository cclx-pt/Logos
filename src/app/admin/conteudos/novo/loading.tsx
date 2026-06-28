import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton da página de novo curso. Reflecte o `CourseForm` real (título +
 * descrição + picker + tags + checkbox de publicado + botões).
 */
export default function Loading() {
  return (
    <div className="min-w-0 space-y-8">
      <Skeleton className="h-4 w-40 md:hidden" />

      <header className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-full max-w-prose" />
      </header>

      <div className="space-y-6">
        <Skeleton className="h-16 w-full" />
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
  );
}
