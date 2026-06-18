'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Menu, X } from 'lucide-react';
import { AdminBadgeLink } from './admin-badge-link';
import { ConversasLink } from './conversas-link';
import { NavLinks } from './nav-links';
import { LiveNavLink } from './live-nav-link';
import { institutionalNavItems, publicContentNavItems, accountNavItems } from '@/lib/site-config';
import { cn } from '@/lib/utils';

type MobileNavProps = {
  showAdminLink?: boolean;
  /** Se há sessão. "Meus cursos" e "As minhas conversas" só aparecem se `true`. */
  isAuthenticated?: boolean;
  conversasHasConversations?: boolean;
  conversasHasUnread?: boolean;
};

export function MobileNav({
  showAdminLink = false,
  isAuthenticated = false,
  conversasHasConversations = false,
  conversasHasUnread = false,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // O painel é renderizado por portal em `document.body` (não como filho do
  // <header>). Isto é deliberado: o header tem `backdrop-blur`
  // (`backdrop-filter`), o que o torna o containing block de descendentes
  // `position: fixed`. Sem o portal, o painel `fixed top-16 bottom-0` ficava
  // ancorado à caixa de 64px do header em vez do viewport e colapsava — era
  // o "menu hamburguer bugado" em mobile. O portal só corre quando `open` é
  // true (sempre após um clique no cliente), por isso `document` existe.
  const panel = (
    <div
      id="mobile-nav-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navegação"
      className={cn(
        'fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto px-6 pt-8 pb-12',
        'bg-background border-border border-t xl:hidden',
      )}
    >
      <LiveNavLink orientation="vertical" onNavigate={() => setOpen(false)} />
      <div className="mt-1">
        <NavLinks
          orientation="vertical"
          items={institutionalNavItems}
          onNavigate={() => setOpen(false)}
        />
      </div>
      <div className="mt-1">
        <NavLinks
          orientation="vertical"
          items={publicContentNavItems}
          onNavigate={() => setOpen(false)}
        />
      </div>
      {isAuthenticated && (
        <div className="border-border mt-6 border-t pt-6">
          <NavLinks
            orientation="vertical"
            items={accountNavItems}
            onNavigate={() => setOpen(false)}
          />
          <ConversasLink
            href="/perguntas"
            hasConversations={conversasHasConversations}
            hasUnread={conversasHasUnread}
            onNavigate={() => setOpen(false)}
            className="px-2 py-3 text-lg"
          />
        </div>
      )}
      {showAdminLink && (
        <div className="border-border mt-6 border-t pt-6">
          <AdminBadgeLink onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <button
        type="button"
        aria-label={open ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        onClick={() => setOpen((v) => !v)}
        className="focus-visible:ring-ring text-ink hover:text-orange-hover -ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none xl:hidden"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open ? createPortal(panel, document.body) : null}
    </>
  );
}
