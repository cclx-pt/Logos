import { Logo } from './logo';
import { NavLinks } from './nav-links';
import { MobileNav } from './mobile-nav';

export function Header() {
  return (
    <header className="bg-background/95 sticky top-0 z-30 border-b border-border backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <MobileNav />
          <Logo size="md" />
        </div>
        <nav aria-label="Navegação principal" className="hidden md:block">
          <NavLinks orientation="horizontal" />
        </nav>
      </div>
    </header>
  );
}
