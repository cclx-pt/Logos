import Link from 'next/link';
import { Check } from 'lucide-react';

import { CourseImage } from '@/lib/courses/course-image';
import { cn } from '@/lib/utils';

/**
 * Card de curso partilhado entre `/conteudos` (catálogo) e `/meus-cursos`
 * (estado pessoal). Três variants cobrem todos os usos actuais:
 *
 *   - `catalog`     — catálogo público. Mostra badge "Em breve" se o curso
 *                     não tiver aulas; nesse caso o link fica desactivado
 *                     (`aria-disabled`, `tabIndex=-1`, `pointer-events-none`).
 *   - `in-progress` — `/meus-cursos`. Badge "Em curso", CTA "Continuar →".
 *   - `completed`   — `/meus-cursos`. Badge "Concluído", CTA "Rever curso →",
 *                     `opacity-60` que volta a 100% no hover.
 */

export type CourseCardData = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  bannerUrl: string | null;
  hasLessons: boolean;
};

type CourseCardProps = {
  course: CourseCardData;
  variant: 'catalog' | 'in-progress' | 'completed';
};

export function CourseCard({ course, variant }: CourseCardProps) {
  const isCompleted = variant === 'completed';
  const isCatalogDisabled = variant === 'catalog' && !course.hasLessons;

  const baseClasses =
    'border-border bg-card focus-visible:ring-ring group flex h-full flex-col rounded-2xl border p-6 focus-visible:ring-2 focus-visible:outline-none';

  const variantClasses = isCatalogDisabled
    ? 'pointer-events-none opacity-70'
    : isCompleted
      ? 'opacity-60 transition-all hover:opacity-100 hover:border-orange-primary/40'
      : 'transition-colors hover:border-orange-primary/40 hover:bg-orange-primary/5';

  return (
    <Link
      href={`/conteudos/${course.id}`}
      aria-disabled={isCatalogDisabled || undefined}
      tabIndex={isCatalogDisabled ? -1 : undefined}
      className={cn(baseClasses, variantClasses)}
    >
      <CourseImage
        bannerUrl={course.bannerUrl}
        iconSlug={course.icon}
        alt={course.title}
        variant="card"
      />
      <div className="mt-5 flex flex-wrap items-start gap-2">
        <h2 className="font-display text-ink text-2xl font-medium tracking-tight">
          {course.title}
        </h2>
        {variant === 'catalog' && !course.hasLessons && (
          <span className="border-orange-primary/30 bg-orange-primary/10 text-orange-primary inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            Em breve
          </span>
        )}
        {variant === 'in-progress' && (
          <span className="border-orange-primary/30 bg-orange-primary/10 text-orange-primary inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            Em curso
          </span>
        )}
        {variant === 'completed' && (
          <span className="border-sage-card bg-sage-card/40 text-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            <Check className="h-3 w-3" aria-hidden="true" />
            Concluído
          </span>
        )}
      </div>
      {course.description ? (
        <p className="text-muted-foreground mt-2 line-clamp-4 text-sm leading-relaxed">
          {course.description}
        </p>
      ) : null}
      {variant === 'catalog' && course.hasLessons && (
        <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
          Ver curso →
        </span>
      )}
      {variant === 'in-progress' && (
        <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
          Continuar →
        </span>
      )}
      {variant === 'completed' && (
        <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
          Rever curso →
        </span>
      )}
    </Link>
  );
}
