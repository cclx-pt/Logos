'use client';

import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function FalaConnoscoContent() {
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
        Fala connosco
      </motion.h1>
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 font-sans text-base leading-relaxed"
      >
        Estamos a preparar esta página. Em breve aqui encontras a forma mais directa de chegar à
        equipa Logos.
      </motion.p>
    </motion.section>
  );
}
