import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Logo } from '@/components/site/logo';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32">
      <Logo size="lg" asStatic />

      <h1 className="font-display text-ink mt-8 text-4xl leading-tight font-medium sm:text-5xl">
        Estudo bíblico para uma fé enraizada.
      </h1>

      <p className="text-muted-foreground mt-6 max-w-2xl font-sans text-base leading-relaxed sm:text-lg">
        A plataforma Logos é o espaço da CCLX para crescer no conhecimento das Escrituras. Cursos
        em vídeo, apostilas para descarregar e o teu ritmo — sempre gratuitos.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <Button size="lg" render={<Link href="/cursos" />}>
          Ver cursos
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="lg" render={<Link href="/conhece-nos" />}>
          Conhece o projeto
        </Button>
      </div>

      <p className="text-muted-foreground mt-16 font-sans text-xs tracking-[0.3em] uppercase">
        Em construção · V1
      </p>
    </section>
  );
}
