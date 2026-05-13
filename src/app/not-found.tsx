import Link from 'next/link';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que procuras não existe ou foi movida.',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32">
      <p className="text-muted-foreground font-mono text-sm tracking-widest uppercase">404</p>
      <h1 className="font-display text-ink mt-4 text-4xl leading-tight font-medium sm:text-5xl">
        Página não encontrada
      </h1>
      <p className="text-muted-foreground mt-6 max-w-xl font-sans text-base leading-relaxed">
        O endereço que tentaste abrir não existe, foi movido, ou ainda não está disponível.
      </p>
      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <Button size="lg" render={<Link href="/" />}>
          Voltar ao início
        </Button>
        <Button variant="ghost" size="lg" render={<Link href="/cursos" />}>
          Ver cursos
        </Button>
      </div>
    </section>
  );
}
