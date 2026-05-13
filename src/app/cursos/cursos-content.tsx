'use client';

import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function CursosContent() {
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
        Cursos
      </motion.h1>
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 font-sans text-base leading-relaxed"
      >
        Em breve poderás explorar aqui o catálogo de cursos: vídeo embebido, apostila para
        descarregar e o teu ritmo. Sempre gratuitos.
      </motion.p>
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-12 font-sans text-xs tracking-[0.3em] uppercase"
      >
        Em breve
      </motion.p>
    </motion.section>
  );
}
