'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { PlayCircle } from 'lucide-react';

import { staggerContainer, staggerItem } from '@/lib/motion-variants';
import { tutorialSteps } from '@/lib/tutorial';
import { extractYoutubeId } from '@/lib/courses/youtube';

export function ComoFuncionaContent() {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <motion.h1
        variants={staggerItem}
        className="font-display text-ink text-4xl font-medium sm:text-5xl"
      >
        Como funciona
      </motion.h1>
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 max-w-2xl font-sans text-lg leading-relaxed"
      >
        Um passeio rápido pelo LOGOS. Em poucos minutos ficas a saber como encontrar cursos, ver as
        aulas, marcar o teu progresso e falar com a equipa.
      </motion.p>

      <ol className="mt-12 space-y-14">
        {tutorialSteps.map((step, index) => {
          const youtubeId = extractYoutubeId(step.youtubeUrl);
          return (
            <motion.li
              key={step.slug}
              id={step.slug}
              variants={staggerItem}
              className="scroll-mt-24"
            >
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="bg-orange-primary/10 text-orange-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-sans text-sm font-semibold"
                >
                  {index + 1}
                </span>
                <h2 className="font-display text-ink text-2xl font-medium tracking-tight">
                  {step.title}
                </h2>
              </div>
              <p className="text-muted-foreground mt-3 max-w-2xl font-sans leading-relaxed">
                {step.description}
              </p>

              <div className="border-border bg-card mt-5 aspect-video overflow-hidden rounded-2xl border">
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
            </motion.li>
          );
        })}
      </ol>

      <motion.div variants={staggerItem} className="mt-16">
        <Link
          href="/conteudos"
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md px-6 font-sans text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Explorar os conteúdos →
        </Link>
      </motion.div>
    </motion.section>
  );
}
