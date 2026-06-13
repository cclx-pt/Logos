import { AdminBadgeLink } from './admin-badge-link';
import { ConversasLink } from './conversas-link';
import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { LiveNavLink } from './live-nav-link';
import { MobileNav } from './mobile-nav';
import { SignInButton } from './sign-in-button';
import { UserMenu } from './user-menu';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isConversationUnread } from '@/lib/questions/question';

export async function Header() {
  const user = await getCurrentUser();
  const showAdminBadge = user !== null && user.role !== 'user';

  // Indicador leve "tens resposta": acende quando há uma conversa do próprio que
  // a equipa respondeu e o aluno ainda não abriu (answered + updated_at >
  // owner_seen_at). Filtro explícito por profile_id - a RLS de admin é
  // permissiva. Falha-aberto (ponto apagado) se a query falhar.
  let conversasHasUnread = false;
  if (user) {
    try {
      const supabase = await getServerClient();
      const { data } = await supabase
        .from('lesson_questions')
        .select('status, updated_at, owner_seen_at')
        .eq('profile_id', user.id)
        .eq('status', 'answered')
        .returns<
          { status: 'new' | 'answered'; updated_at: string; owner_seen_at: string | null }[]
        >();
      conversasHasUnread = (data ?? []).some((r) =>
        isConversationUnread({
          status: r.status,
          updatedAt: r.updated_at,
          ownerSeenAt: r.owner_seen_at,
        }),
      );
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
          <nav
            aria-label="Navegação principal"
            className="hidden items-center gap-6 md:flex lg:gap-8"
          >
            <NavLinks orientation="horizontal" />
            <LiveNavLink orientation="horizontal" />
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
