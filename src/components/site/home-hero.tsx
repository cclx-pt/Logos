'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Logo } from './logo';
import { buttonVariants } from '@/components/ui/button';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function HomeHero() {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32"
    >
      <motion.div variants={staggerItem}>
        <Logo size="lg" asStatic />
      </motion.div>

      <motion.h1
        variants={staggerItem}
        className="font-display text-ink mt-8 text-4xl leading-tight font-medium sm:text-5xl"
      >
        Estudo bíblico para uma fé enraizada.
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 max-w-2xl font-sans text-base leading-relaxed sm:text-lg"
      >
        O ministério Logos é o espaço da CCLX para crescer no conhecimento das Escrituras. Cursos em
        vídeo, apostilas para descarregar e o teu ritmo — sempre gratuitos.
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
      >
        <Link href="/cursos" className={buttonVariants({ size: 'lg' })}>
          Ver cursos
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
        <Link href="/conhece-nos" className={buttonVariants({ variant: 'ghost', size: 'lg' })}>
          Conhece o projeto
        </Link>
      </motion.div>
    </motion.section>
  );
}
