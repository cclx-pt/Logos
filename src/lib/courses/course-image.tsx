/**
 * Renderiza a imagem visual de um curso: banner se existir, icon Lucide
 * em caixa estilizada como fallback.
 *
 * Convenção de uso:
 *   - Cards de listagem (`/conteudos`, `/meus-cursos`, admin) → `variant="card"`
 *   - Landing page do curso (`/conteudos/[courseId]`) → `variant="hero"`
 *
 * Banner: signed URL gerada server-side (helpers em `./banner.ts`). Como
 * a URL rotaciona a cada 30 min (TTL), o Next/Image optimization daria
 * cache miss em cada rotação — passamos `unoptimized` para servir
 * directamente do Supabase Storage CDN. Admin deve fazer upload de
 * banners já comprimidos (recomendação 16:9, JPEG/WebP ≤ 500 KB).
 *
 * Fallback: o icon Lucide centrado num fundo `bg-orange-primary/5` mantém
 * a estética actual dos cards (V3 PR5).
 */

import Image from 'next/image';

import { cn } from '@/lib/utils';

import { CourseIcon } from './icons';

type CourseImageProps = {
  bannerUrl: string | null;
  iconSlug: string | null;
  /** Texto alternativo. Geralmente `course.title`. */
  alt: string;
  /**
   * Tamanho/proporção.
   *   - `card` — vertical, aspect-video em cima do texto (mantido para compat).
   *   - `card-split` — banner em mobile (aspect-video), painel à esquerda
   *     a preencher a altura do card em desktop. Cantos não-arredondados;
   *     o pai (`CourseCard`) tem `overflow-hidden` para cortar.
   *   - `hero` — landing page do curso.
   */
  variant: 'card' | 'card-split' | 'hero';
  className?: string;
};

export function CourseImage({ bannerUrl, iconSlug, alt, variant, className }: CourseImageProps) {
  const wrapper = (() => {
    if (variant === 'hero') {
      return 'relative aspect-video w-full overflow-hidden rounded-2xl bg-orange-primary/5';
    }
    if (variant === 'card-split') {
      return 'relative aspect-video w-full overflow-hidden bg-orange-primary/5 sm:aspect-auto sm:h-full';
    }
    return 'relative aspect-video w-full overflow-hidden rounded-xl bg-orange-primary/5';
  })();

  const sizes = (() => {
    if (variant === 'hero') return '(min-width: 1024px) 720px, 100vw';
    if (variant === 'card-split') return '(min-width: 1024px) 200px, (min-width: 640px) 33vw, 100vw';
    return '(min-width: 1024px) 300px, (min-width: 640px) 50vw, 100vw';
  })();

  const iconSize = (() => {
    if (variant === 'hero') return 'h-20 w-20';
    if (variant === 'card-split') return 'h-14 w-14';
    return 'h-12 w-12';
  })();

  if (bannerUrl) {
    return (
      <div className={cn(wrapper, className)} data-testid="course-image-banner">
        <Image src={bannerUrl} alt={alt} fill sizes={sizes} className="object-cover" unoptimized />
      </div>
    );
  }

  return (
    <div
      className={cn(wrapper, 'text-orange-primary flex items-center justify-center', className)}
      data-testid="course-image-icon"
    >
      <CourseIcon slug={iconSlug} className={iconSize} />
    </div>
  );
}
