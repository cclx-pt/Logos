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
  /** Tamanho/proporção. `card` para listagens, `hero` para landing. */
  variant: 'card' | 'hero';
  className?: string;
};

export function CourseImage({ bannerUrl, iconSlug, alt, variant, className }: CourseImageProps) {
  // Ambas as variants usam banner horizontal 16:9 (`aspect-video`) —
  // ratio standard para thumbnails/banners, evita distorção em qualquer
  // contexto. `object-cover` no <Image> garante crop limpo.
  //   - `card`: edge-to-edge no topo do card; o card tem `overflow-hidden`
  //             e a imagem segue os cantos sem precisar de `rounded-*` própria.
  //   - `hero`: cantos próprios para a landing do curso.
  const wrapper =
    variant === 'hero'
      ? 'relative aspect-video w-full overflow-hidden rounded-2xl bg-orange-primary/5'
      : 'relative aspect-video w-full bg-orange-primary/5';

  if (bannerUrl) {
    return (
      <div className={cn(wrapper, className)} data-testid="course-image-banner">
        <Image
          src={bannerUrl}
          alt={alt}
          fill
          sizes={
            variant === 'hero'
              ? '(min-width: 1024px) 720px, 100vw'
              : '(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
          }
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div
      className={cn(wrapper, 'text-orange-primary flex items-center justify-center', className)}
      data-testid="course-image-icon"
    >
      <CourseIcon slug={iconSlug} className={variant === 'hero' ? 'h-20 w-20' : 'h-14 w-14'} />
    </div>
  );
}
