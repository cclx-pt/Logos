import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conhece-nos',
  description: 'Quem somos, o que fazemos e porquê.',
};

export default function ConheceNosPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <h1 className="font-display text-ink text-4xl font-medium sm:text-5xl">Conhece-nos</h1>
      <p className="text-muted-foreground mt-6 font-sans text-base leading-relaxed">
        Em breve, vais poder ler aqui a história do projeto Logos e da equipa da CCLX que o
        construiu.
      </p>
    </section>
  );
}
