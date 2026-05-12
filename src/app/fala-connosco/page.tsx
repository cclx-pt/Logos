import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Fala connosco',
  description: 'Como entrar em contacto com a equipa Logos da CCLX.',
};

export default function FalaConnoscoPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
      <h1 className="font-display text-ink text-4xl font-medium sm:text-5xl">Fala connosco</h1>
      <p className="text-muted-foreground mt-6 font-sans text-base leading-relaxed">
        Estamos a preparar esta página. Em breve aqui encontras a forma mais directa de chegar à
        equipa Logos.
      </p>
    </section>
  );
}
