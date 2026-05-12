'use client';

import Link from 'next/link';
import { motion, type Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Logo } from './logo';
import { Button } from '@/components/ui/button';

const container: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

export function HomeHero() {
  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32"
    >
      <motion.div variants={item}>
        <Logo size="lg" asStatic />
      </motion.div>

      <motion.h1
        variants={item}
        className="font-display text-ink mt-8 text-4xl leading-tight font-medium sm:text-5xl"
      >
        Estudo bíblico para uma fé enraizada.
      </motion.h1>

      <motion.p
        variants={item}
        className="text-muted-foreground mt-6 max-w-2xl font-sans text-base leading-relaxed sm:text-lg"
      >
        A plataforma Logos é o espaço da CCLX para crescer no conhecimento das Escrituras. Cursos em
        vídeo, apostilas para descarregar e o teu ritmo — sempre gratuitos.
      </motion.p>

      <motion.div
        variants={item}
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
      >
        <Button size="lg" render={<Link href="/cursos" />}>
          Ver cursos
          <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
        <Button variant="ghost" size="lg" render={<Link href="/conhece-nos" />}>
          Conhece o projeto
        </Button>
      </motion.div>
    </motion.section>
  );
}
