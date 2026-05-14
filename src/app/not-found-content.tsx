'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function NotFoundContent() {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-3xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32"
    >
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground font-mono text-sm tracking-widest uppercase"
      >
        404
      </motion.p>
      <motion.h1
        variants={staggerItem}
        className="font-display text-ink mt-4 text-4xl leading-tight font-medium sm:text-5xl"
      >
        Página não encontrada
      </motion.h1>
      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 max-w-xl font-sans text-base leading-relaxed"
      >
        O endereço que tentaste abrir não existe, foi movido, ou ainda não está disponível.
      </motion.p>
      <motion.div
        variants={staggerItem}
        className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:gap-4"
      >
        <Button size="lg" render={<Link href="/" />}>
          Voltar ao início
        </Button>
        <Button variant="ghost" size="lg" render={<Link href="/conteudos" />}>
          Ver conteúdos
        </Button>
      </motion.div>
    </motion.section>
  );
}
