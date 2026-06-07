import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getCurrentUser } from '@/lib/auth';
import { safeNextPath } from '@/lib/auth/redirect';
import { ProviderSignIn } from '@/components/site/provider-sign-in';
import { EmailOtpSignIn } from '@/components/site/email-otp-sign-in';

export const metadata: Metadata = {
  title: 'Entrar · LOGOS',
  description: 'Inicia sessão com Google, Microsoft ou com um código enviado para o teu email.',
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function EntrarPage({ searchParams }: PageProps) {
  const { next: nextRaw } = await searchParams;
  const next = safeNextPath(nextRaw) ?? undefined;

  // Já autenticado: não há nada para fazer aqui — segue para o destino.
  const user = await getCurrentUser();
  if (user) {
    redirect(next ?? '/');
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16 sm:py-20">
      <header className="text-center">
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Entrar</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Escolhe como queres iniciar sessão. É sempre gratuito.
        </p>
      </header>

      <div className="mt-8">
        <ProviderSignIn next={next} className="sm:flex-col sm:items-stretch" />
      </div>

      <div className="my-6 flex items-center gap-3" aria-hidden="true">
        <span className="bg-border h-px flex-1" />
        <span className="text-muted-foreground text-xs tracking-wide uppercase">ou</span>
        <span className="bg-border h-px flex-1" />
      </div>

      <EmailOtpSignIn next={next} />

      <p className="text-muted-foreground mt-8 text-center text-xs">
        Ao entrar com email, recebes um código de uso único. Não há palavra-passe para criar nem
        recuperar.
      </p>
    </section>
  );
}
