import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';

import { getCurrentUser } from '@/lib/auth';
import { isAdmin, isSuperAdmin } from '@/lib/auth/guards';
import { SaveToastListener } from '@/components/ui/save-toast-listener';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role === 'user') {
    // Conteúdo restrito é invisível: mostramos 404 PT-PT em vez de "acesso negado".
    // CLAUDE.md §🚫: "Conteúdo restrito por etiqueta é invisível, nunca aparece com cadeado".
    notFound();
  }

  const canSeeUsers = isSuperAdmin(user.role);
  const canSeeCourses = isAdmin(user.role);

  // Fonte única dos links de gestão (filtrados por papel). Renderizados uma só
  // vez e adaptados ao ecrã: em mobile uma fila de chips que quebra de linha,
  // em md+ a barra lateral vertical de sempre. Antes a nav era `hidden md:block`
  // e o painel `/admin` não tinha links - em mobile a área admin ficava sem
  // navegação (becos sem saída para Conteúdos, Estatísticas, etc.).
  const navItems = [
    { href: '/admin', label: 'Painel', show: true },
    { href: '/admin/conteudos', label: 'Conteúdos', show: canSeeCourses },
    { href: '/admin/estatisticas', label: 'Estatísticas', show: canSeeCourses },
    { href: '/admin/perguntas', label: 'Perguntas', show: canSeeCourses },
    { href: '/admin/live', label: 'Live', show: canSeeCourses },
    { href: '/admin/utilizadores', label: 'Utilizadores', show: canSeeUsers },
    { href: '/admin/etiquetas', label: 'Etiquetas', show: canSeeUsers },
  ].filter((item) => item.show);

  return (
    <div className="flex w-full flex-1 flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:gap-8 lg:px-8 xl:px-10 2xl:px-14">
      <aside aria-label="Navegação da área admin" className="md:w-48 md:shrink-0 lg:w-56">
        <p className="text-muted-foreground hidden text-xs font-medium tracking-widest uppercase md:block">
          Área admin
        </p>
        <nav className="flex flex-wrap gap-1.5 md:mt-3 md:flex-col md:gap-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-ink hover:text-orange-hover focus-visible:ring-ring bg-sage-card rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none md:bg-transparent md:px-2 md:py-1.5"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
      <Suspense fallback={null}>
        <SaveToastListener />
      </Suspense>
    </div>
  );
}
