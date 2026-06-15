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
import { institutionalNavItems, functionalNavItems } from '@/lib/site-config';

export async function Header() {
  const user = await getCurrentUser();
  const showAdminBadge = user !== null && user.role !== 'user';

  // Estado do ponto "As minhas conversas" (duas cores, sem gamificação):
  //  - laranja (alerta): conversa do próprio que a equipa respondeu e o aluno
  //    ainda não abriu (answered + updated_at > owner_seen_at).
  //  - cinza (neutro): há conversas mas nada novo por ler.
  // Filtro explícito por profile_id - a RLS de admin é permissiva. Falha-aberto
  // (sem ponto) se a query falhar.
  let conversasHasUnread = false;
  let conversasHasConversations = false;
  if (user) {
    try {
      const supabase = await getServerClient();
      const { data } = await supabase
        .from('lesson_questions')
        .select('status, updated_at, owner_seen_at')
        .eq('profile_id', user.id)
        .returns<
          { status: 'new' | 'answered'; updated_at: string; owner_seen_at: string | null }[]
        >();
      const rows = data ?? [];
      conversasHasConversations = rows.length > 0;
      conversasHasUnread = rows.some((r) =>
        isConversationUnread({
          status: r.status,
          updatedAt: r.updated_at,
          ownerSeenAt: r.owner_seen_at,
        }),
      );
    } catch {
      conversasHasUnread = false;
      conversasHasConversations = false;
    }
  }

  // "As minhas conversas" aparece a toda a gente: deslogado, o link força o
  // login e volta a /perguntas (a própria página também tem este guard).
  const conversasHref = user ? '/perguntas' : '/entrar?next=/perguntas';

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile: hamburguer + logo juntos à esquerda. Em xl o wrapper vira
            `display:contents` e o Logo passa a primeiro item equidistante da barra. */}
        <div className="flex items-center gap-3 xl:contents">
          <MobileNav
            showAdminLink={showAdminBadge}
            conversasHref={conversasHref}
            conversasHasConversations={conversasHasConversations}
            conversasHasUnread={conversasHasUnread}
          />
          <Logo size="md" />
        </div>
        {/* Navegação (só xl). O <nav> está em `display:contents`: logo, links,
            conversas e admin tornam-se irmãos diretos da barra, por isso o
            justify-between distribui tudo à mesma distância - e o espaço encolhe
            uniformemente quando o "Área admin" aparece. */}
        <nav aria-label="Navegação principal" className="hidden whitespace-nowrap xl:contents">
          <NavLinks orientation="horizontal" items={institutionalNavItems} flatten />
          <LiveNavLink orientation="horizontal" />
          <NavLinks orientation="horizontal" items={functionalNavItems} flatten />
          <ConversasLink
            href={conversasHref}
            hasConversations={conversasHasConversations}
            hasUnread={conversasHasUnread}
            className="whitespace-nowrap"
          />
          {showAdminBadge && <AdminBadgeLink />}
        </nav>
        {/* Conta/perfil - último item; o justify-between encosta-o à direita. */}
        {user ? <UserMenu user={user} /> : <SignInButton />}
      </div>
    </header>
  );
}
