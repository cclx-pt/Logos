import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { MobileNav } from './mobile-nav';
import { SignInButton } from './sign-in-button';
import { UserMenu } from './user-menu';
import { getCurrentUser } from '@/lib/auth';

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="bg-background/95 border-border supports-[backdrop-filter]:bg-background/80 sticky top-0 z-30 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Logo size="md" />
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <nav aria-label="Navegação principal" className="hidden md:block">
            <NavLinks orientation="horizontal" />
          </nav>
          {user ? <UserMenu user={user} /> : <SignInButton />}
        </div>
      </div>
    </header>
  );
}
