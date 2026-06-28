import type { MetadataRoute } from 'next';
import { siteConfig, navItems } from '@/lib/site-config';

/** Rotas que não estão na nav principal mas devem entrar no sitemap. */
const extraRoutes = ['/conteudos/cursos', '/live', '/como-funciona'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return [
    {
      url: siteConfig.url,
      lastModified,
      changeFrequency: 'monthly',
      priority: 1,
    },
    ...navItems.map((item) => ({
      url: `${siteConfig.url}${item.href}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    ...extraRoutes.map((href) => ({
      url: `${siteConfig.url}${href}`,
      lastModified,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
