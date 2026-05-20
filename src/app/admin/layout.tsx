import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';

import { getCurrentUser } from '@/lib/auth';
import { SaveToastListener } from '@/components/ui/save-toast-listener';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();

  if (!user || user.role === 'user') {
    // Conteúdo restrito é invisível: mostramos 404 PT-PT em vez de "acesso negado".
    // CLAUDE.md §🚫: "Conteúdo restrito por etiqueta é invisível, nunca aparece com cadeado".
    notFound();
  }

  const canSeeUsers = user.role === 'super_admin';
  const canSeeCourses = user.role === 'admin' || user.role === 'super_admin';

  return (
    <div className="flex w-full flex-1 gap-8 px-4 py-10 sm:px-6 lg:px-8 xl:px-10 2xl:px-14">
      <aside aria-label="Navegação da área admin" className="hidden w-48 shrink-0 md:block lg:w-56">
        <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">
          Área admin
        </p>
        <nav className="mt-3 flex flex-col gap-1 text-sm">
          <Link
            href="/admin"
            className="text-ink hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Painel
          </Link>
          {canSeeCourses && (
            <Link
              href="/admin/conteudos"
              className="text-ink hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Conteúdos
            </Link>
          )}
          {canSeeUsers && (
            <Link
              href="/admin/utilizadores"
              className="text-ink hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Utilizadores
            </Link>
          )}
          {canSeeUsers && (
            <Link
              href="/admin/etiquetas"
              className="text-ink hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Etiquetas
            </Link>
          )}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
      <Suspense fallback={null}>
        <SaveToastListener />
      </Suspense>
    </div>
  );
}
