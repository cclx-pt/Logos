import { AdminBadgeLink } from './admin-badge-link';
import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { LiveNavLink } from './live-nav-link';
import { MobileNav } from './mobile-nav';
import { SignInButton } from './sign-in-button';
import { UserMenu } from './user-menu';
import { getCurrentUser } from '@/lib/auth';

export async function Header() {
  const user = await getCurrentUser();
  const showAdminBadge = user !== null && user.role !== 'user';

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileNav showAdminLink={showAdminBadge} />
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
          {showAdminBadge && <AdminBadgeLink className="hidden md:inline-flex" />}
          {user ? <UserMenu user={user} /> : <SignInButton />}
        </div>
      </div>
    </header>
  );
}
