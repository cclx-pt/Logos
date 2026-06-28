import Link from 'next/link';
import { Logo } from './logo';
import { siteConfig } from '@/lib/site-config';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-border bg-background mt-16 border-t">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex flex-col gap-2">
          <Logo size="sm" />
          <p className="text-muted-foreground max-w-md font-sans text-sm">
            {siteConfig.description}
          </p>
        </div>
        <div className="text-muted-foreground flex flex-col items-start gap-2 font-sans text-sm md:items-end">
          <Link href="/como-funciona" className="hover:text-orange-hover transition-colors">
            Como funciona
          </Link>
          <Link
            href={siteConfig.organization.website}
            className="hover:text-orange-hover transition-colors"
            rel="noreferrer"
          >
            {siteConfig.organization.fullName}
          </Link>
          <Link href="/privacidade" className="hover:text-orange-hover transition-colors">
            Política de Privacidade
          </Link>
          <p>
            © {year} {siteConfig.organization.name}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
