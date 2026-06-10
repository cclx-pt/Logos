'use client';

import { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { cn } from '@/lib/utils';

type Testimonial = {
  quote: string;
  author: string;
};

const testimonials: readonly Testimonial[] = [
  {
    quote:
      'O ministério LOGOS está a ser uma benção na minha vida. Faz-me sair da zona de conforto e ir mais fundo nas Escrituras. Muito obrigado a todos os envolvidos! Deus vos abençoe.',
    author: 'Bernardo Degues',
  },
  {
    quote:
      'O LOGOS tem servido para somar mais proximidade com a Palavra, descobrir novos detalhes, repensar na Sua mensagem e aplicá-la no meu dia-a-dia. Uma forma simples, leve mas profunda para estudar a Bíblia. Uma hora que voa e que nos deixa com vontade de mais! Prefiro as aulas presenciais, que são também excelentes oportunidades para fazer em casal. Obrigada aos professores!',
    author: 'Sara Narciso',
  },
  {
    quote:
      'Este tempo no LOGOS foi extremamente proveitoso e edificante para mim. Aprendi muito sobre a Bíblia e tive contacto com temas e curiosidades que eu nunca tinha estudado com profundidade. Foi um conteúdo muito enriquecedor!',
    author: 'Raniere Bruno',
  },
  {
    quote:
      'Nas aulas do LOGOS consigo aprofundar temas que muitas vezes numa pregação não há tempo para explorar. Também me fez desconstruir algumas ideias erradas que tinha há anos e perceber melhor a Palavra com mais contexto e maturidade. Sou muito grato por tudo o que tenho aprendido aqui.',
    author: 'André Mata',
  },
] as const;

export function HomeTestimonials() {
  const [autoplay] = useState(() =>
    Autoplay({ delay: 6500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' }, [autoplay]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const sync = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setScrollSnaps(emblaApi.scrollSnapList());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', sync);
    emblaApi.on('reInit', sync);
    // Snapshot inicial do embla, fora do critical render path para não
    // disparar cascading renders dentro do effect body.
    const microtask = queueMicrotask(sync);
    return () => {
      emblaApi.off('select', sync);
      emblaApi.off('reInit', sync);
      void microtask;
    };
  }, [emblaApi, sync]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section
      aria-label="Testemunhos de quem usa o LOGOS"
      className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 sm:pb-24 lg:pb-28"
    >
      <div className="overflow-hidden" ref={emblaRef}>
        <ul className="flex">
          {testimonials.map((t, i) => (
            <li
              key={i}
              className="flex w-full shrink-0 grow-0 basis-full px-2"
              aria-roledescription="slide"
              aria-label={`Testemunho ${i + 1} de ${testimonials.length}`}
            >
              <figure className="border-border bg-background flex h-full w-full flex-col rounded-2xl border px-6 py-8 sm:flex-row sm:items-center sm:gap-8 sm:px-10 sm:py-10">
                <Quote
                  className="text-orange h-8 w-8 shrink-0 sm:h-12 sm:w-12"
                  aria-hidden="true"
                />
                <div className="mt-4 sm:mt-0">
                  <blockquote className="text-ink font-sans text-lg leading-relaxed sm:text-xl">
                    &ldquo;{t.quote}&rdquo;
                  </blockquote>
                  <figcaption className="text-muted-foreground font-display mt-4 text-base font-medium">
                    {t.author}
                  </figcaption>
                </div>
              </figure>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={scrollPrev}
          aria-label="Testemunho anterior"
          className="border-border text-ink hover:border-orange focus-visible:ring-ring inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <ul className="flex items-center gap-2" role="tablist" aria-label="Selecionar testemunho">
          {scrollSnaps.map((_, i) => {
            const isActive = i === selectedIndex;
            return (
              <li key={i}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Ir para testemunho ${i + 1}`}
                  onClick={() => scrollTo(i)}
                  className={cn(
                    'focus-visible:ring-ring h-2 rounded-full transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
                    isActive ? 'bg-orange w-6' : 'bg-border w-2',
                  )}
                />
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={scrollNext}
          aria-label="Testemunho seguinte"
          className="border-border text-ink hover:border-orange focus-visible:ring-ring inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
