'use client';

import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function EscolaBiblicaContent() {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <motion.h1
        variants={staggerItem}
        className="font-display text-ink text-4xl font-medium sm:text-5xl"
      >
        Escola Bíblica
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-8 font-sans text-lg leading-relaxed"
      >
        Esta área vai reunir as transmissões da Escola Bíblica da CCLX. Ainda está em construção —
        deixámos o espaço pronto para quando chegar.
      </motion.p>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-16 font-sans text-xs tracking-[0.3em] uppercase"
      >
        Em breve
      </motion.p>
    </motion.section>
  );
}
