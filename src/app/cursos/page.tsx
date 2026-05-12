import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cursos',
  description: 'Em breve — cursos de estudo bíblico em vídeo com apostilas para descarregar.',
};

export default function CursosPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <h1 className="font-display text-ink text-4xl font-medium sm:text-5xl">Cursos</h1>
      <p className="text-muted-foreground mt-6 font-sans text-base leading-relaxed">
        Em breve poderás explorar aqui o catálogo de cursos: vídeo embebido, apostila para
        descarregar e o teu ritmo. Sempre gratuitos.
      </p>
      <p className="text-muted-foreground mt-12 font-sans text-xs tracking-[0.3em] uppercase">
        Em breve
      </p>
    </section>
  );
}
