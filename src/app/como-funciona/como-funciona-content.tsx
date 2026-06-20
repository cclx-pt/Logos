'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';

import { tutorialSteps } from '@/lib/tutorial';
import { extractYoutubeId } from '@/lib/courses/youtube';
import { cn } from '@/lib/utils';

/**
 * Tutorial "Como funciona" em formato wizard: um passo (um vídeo) de cada vez,
 * com Anterior/Seguinte. O último passo encaminha para os conteúdos.
 */
export function ComoFuncionaContent() {
  const total = tutorialSteps.length;
  const [index, setIndex] = useState(0);
  const step = tutorialSteps[index];
  const youtubeId = extractYoutubeId(step.youtubeUrl);
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
      <h1 className="font-display text-ink text-4xl font-medium sm:text-5xl">Como funciona</h1>
      <p className="text-muted-foreground mt-4 max-w-2xl font-sans leading-relaxed">
        Um passeio rápido pelas principais funcionalidades. Avança com o botão Seguinte.
      </p>

      {/* Progresso: pontos + texto acessível. */}
      <div className="mt-8 flex items-center gap-1.5" aria-hidden="true">
        {tutorialSteps.map((s, i) => (
          <span
            key={s.slug}
            className={cn(
              'h-1.5 rounded-full transition-all',
              i === index ? 'bg-orange-primary w-8' : 'bg-border w-4',
            )}
          />
        ))}
      </div>
      <p className="text-muted-foreground mt-2 font-sans text-sm">
        Passo {index + 1} de {total}
      </p>

      {/* Passo atual. aria-live anuncia a mudança a leitores de ecrã. */}
      <div aria-live="polite">
        <motion.div
          key={step.slug}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="mt-4"
        >
          <h2 className="font-display text-ink text-2xl font-medium tracking-tight">
            {step.title}
          </h2>

          <div className="border-border bg-card mt-4 aspect-video overflow-hidden rounded-2xl border">
            {youtubeId ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
                title={`Vídeo: ${step.title}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="h-full w-full"
              />
            ) : (
              <div className="text-muted-foreground flex h-full w-full flex-col items-center justify-center gap-2">
                <PlayCircle aria-hidden="true" className="h-10 w-10" />
                <span className="font-sans text-sm">Vídeo em breve</span>
              </div>
            )}
          </div>

          <p className="text-muted-foreground mt-4 font-sans leading-relaxed">{step.description}</p>
        </motion.div>
      </div>

      {/* Navegação. */}
      <div className="mt-8 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={isFirst}
          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-11 items-center gap-2 rounded-md border px-4 font-sans text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Anterior
        </button>

        {isLast ? (
          <Link
            href="/conteudos"
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center gap-2 rounded-md px-5 font-sans text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Concluir
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center gap-2 rounded-md px-5 font-sans text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Seguinte
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
}
