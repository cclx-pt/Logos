import { AdminBadgeLink } from './admin-badge-link';
import { ConversasLink } from './conversas-link';
import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { MobileNav } from './mobile-nav';
import { SignInButton } from './sign-in-button';
import { UserMenu } from './user-menu';
import { getCurrentUser, getServerClient } from '@/lib/auth';

export async function Header() {
  const user = await getCurrentUser();
  const showAdminBadge = user !== null && user.role !== 'user';

  // Indicador leve "tens resposta": conta as conversas do próprio em 'answered'
  // (filtro explícito por profile_id - a RLS de admin é permissiva). head-count,
  // sem trazer linhas. Falha-aberto (ponto apagado) se a query falhar.
  let conversasHasUnread = false;
  if (user) {
    try {
      const supabase = await getServerClient();
      const { count } = await supabase
        .from('lesson_questions')
        .select('id', { count: 'exact', head: true })
        .eq('profile_id', user.id)
        .eq('status', 'answered');
      conversasHasUnread = (count ?? 0) > 0;
    } catch {
      conversasHasUnread = false;
    }
  }

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileNav
            showAdminLink={showAdminBadge}
            showConversasLink={user !== null}
            conversasHasUnread={conversasHasUnread}
          />
          <Logo size="md" />
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <nav aria-label="Navegação principal" className="hidden md:block">
            <NavLinks orientation="horizontal" />
          </nav>
          {user && (
            <ConversasLink hasUnread={conversasHasUnread} className="hidden md:inline-flex" />
          )}
          {showAdminBadge && <AdminBadgeLink className="hidden md:inline-flex" />}
          {user ? <UserMenu user={user} /> : <SignInButton />}
        </div>
      </div>
    </header>
  );
}
