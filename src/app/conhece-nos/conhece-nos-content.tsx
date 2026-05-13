'use client';

import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function ConheceNosContent() {
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
        Conhece-nos
      </motion.h1>
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 font-sans text-base leading-relaxed"
      >
        Em breve, vais poder ler aqui a história do projeto Logos e da equipa da CCLX que o
        construiu.
      </motion.p>
    </motion.section>
  );
}
