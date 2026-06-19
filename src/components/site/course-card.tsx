import Link from 'next/link';
import { Check, Lock } from 'lucide-react';

import { CourseImage } from '@/lib/courses/course-image';
import { cn } from '@/lib/utils';

/**
 * Card de curso partilhado entre `/conteudos` (catálogo) e `/meus-cursos`
 * (estado pessoal). Três variants cobrem todos os usos actuais:
 *
 *   - `catalog`     — catálogo público. Mostra badge "Em breve" se o curso
 *                     não tiver aulas (só para utilizadores autenticados).
 *                     Se a flag `isCompleted` for true, replica a UX do
 *                     variant `completed` (greyout + badge + "Rever curso").
 *                     **Não mostra descrição** — fica reservada à landing.
 *   - `in-progress` — `/meus-cursos`. Badge "Em curso", CTA "Continuar →".
 *                     Mostra descrição.
 *   - `completed`   — `/meus-cursos`. Badge "Concluído", CTA "Rever curso →",
 *                     `opacity-60` que volta a 100% no hover. Mostra descrição.
 *
 * Layout: vertical. Imagem (banner ou icon fallback) preenche o **quadrado
 * de topo edge-to-edge** (`aspect-square`); o card tem `overflow-hidden`
 * para os cantos da imagem seguirem os do card sem cantos próprios. Texto
 * vive numa coluna com `p-6` por baixo.
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
  /**
   * Estado de autenticação. Só relevante para `catalog` — anon não vê a
   * badge "Em breve" nem o card disabled. Para anon, todos os cards
   * são clicáveis e o redireccionamento para login acontece na landing.
   * Default `true` para manter compat com variants `in-progress` /
   * `completed` (que só renderizam para utilizadores logados).
   */
  isAuthenticated?: boolean;
  /**
   * Para variant `catalog`: utilizador logado já concluiu este curso →
   * aplica greyout + badge "Concluído" + CTA "Rever curso →" (mesma UX
   * de `/meus-cursos` "Terminados"). Ignorado pelos outros variants.
   */
  isCompleted?: boolean;
  /**
   * Para variant `catalog`: utilizador logado já começou (inscreveu-se) mas
   * ainda não concluiu este curso → badge "Em curso" + CTA "Continuar →".
   * Permite diferenciar no catálogo os três estados: por começar / em curso /
   * concluído. `isCompleted` tem precedência. Ignorado pelos outros variants.
   */
  isInProgress?: boolean;
  /**
   * V3.6: para variant `catalog`, título do curso pré-requisito ainda por
   * concluir. Quando presente (e o utilizador logado não concluiu este
   * curso), o card fica bloqueado: cinzento, não-clicável, com a dica
   * "Conclui [título] primeiro". `null`/ausente = sem bloqueio.
   */
  lockedByPrerequisite?: string | null;
};

export function CourseCard({
  course,
  variant,
  isAuthenticated = true,
  isCompleted = false,
  isInProgress = false,
  lockedByPrerequisite = null,
}: CourseCardProps) {
  const isCatalog = variant === 'catalog';
  const showCompletedUx = variant === 'completed' || (isCatalog && isCompleted);
  // Catálogo: curso já começado (inscrito) e ainda não concluído. Quem já
  // começou passou o pré-requisito e o curso tem aulas, por isso este estado
  // tem precedência sobre "Em breve"/"Bloqueado" (e fica sempre clicável).
  const showInProgressUx = isCatalog && isAuthenticated && isInProgress && !isCompleted;
  // V3.6: bloqueio por pré-requisito (só catálogo, só autenticado, curso não
  // concluído e não começado - quem já concluiu/começou pode entrar).
  const prerequisiteTitle =
    isCatalog && isAuthenticated && !isCompleted && !showInProgressUx ? lockedByPrerequisite : null;
  const isPrerequisiteLocked = prerequisiteTitle !== null;
  // "Em breve" + disabled só faz sentido para utilizadores autenticados —
  // anon nunca poderia entrar mesmo num curso com aulas (cai no CTA de login).
  // Cursos concluídos/começados no catálogo nunca ficam disabled.
  const showComingSoonBadge =
    isCatalog &&
    isAuthenticated &&
    !isCompleted &&
    !showInProgressUx &&
    !course.hasLessons &&
    !isPrerequisiteLocked;
  const isCatalogDisabled = showComingSoonBadge || isPrerequisiteLocked;

  const baseClasses =
    'border-border bg-card focus-visible:ring-ring group flex h-full flex-col overflow-hidden rounded-2xl border focus-visible:ring-2 focus-visible:outline-none';

  const variantClasses = isCatalogDisabled
    ? 'pointer-events-none opacity-70'
    : showCompletedUx
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
      <div className="flex flex-1 flex-col p-6">
        <div className="flex flex-wrap items-start gap-2">
          <h2 className="font-display text-ink text-2xl leading-tight font-medium tracking-tight break-words">
            {course.title}
          </h2>
          {showComingSoonBadge && (
            <span className="border-orange-primary/30 bg-orange-primary/10 text-orange-primary inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              Em breve
            </span>
          )}
          {isPrerequisiteLocked && (
            <span className="border-border bg-muted/40 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Bloqueado
            </span>
          )}
          {(variant === 'in-progress' || showInProgressUx) && (
            <span className="border-orange-primary/30 bg-orange-primary/10 text-orange-primary inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              Em curso
            </span>
          )}
          {showCompletedUx && (
            <span className="border-sage-card bg-sage-card/40 text-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
              <Check className="h-3 w-3" aria-hidden="true" />
              Concluído
            </span>
          )}
        </div>
        {!isCatalog && course.description ? (
          <p className="text-muted-foreground mt-2 line-clamp-4 text-sm leading-relaxed break-words">
            {course.description}
          </p>
        ) : null}
        {isPrerequisiteLocked ? (
          <span className="text-muted-foreground mt-auto inline-flex items-center gap-1 pt-5 text-xs font-medium tracking-wide uppercase">
            <Lock className="h-3 w-3" aria-hidden="true" />
            Conclui {prerequisiteTitle} primeiro
          </span>
        ) : showCompletedUx ? (
          <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
            Rever curso →
          </span>
        ) : showInProgressUx ? (
          <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
            Continuar →
          </span>
        ) : isCatalog && !isCatalogDisabled ? (
          <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
            Ver curso →
          </span>
        ) : variant === 'in-progress' ? (
          <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
            Continuar →
          </span>
        ) : null}
      </div>
    </Link>
  );
}
