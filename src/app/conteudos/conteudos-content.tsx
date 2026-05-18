'use client';

import { motion } from 'motion/react';
import { Sparkles } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function ConteudosContent() {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <motion.h1
        variants={staggerItem}
        className="font-display text-ink text-4xl font-medium sm:text-5xl"
      >
        Conteúdos
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-8 text-justify font-sans text-lg leading-relaxed hyphens-auto"
      >
        Os nossos conteúdos foram desenvolvidos para fortalecer a igreja e aprofundar o amor pelas
        Escrituras. Disponibilizamos diferentes formatos, aulas gravadas, apostilas, materiais de
        apoio e outros recursos pensados para tornar o ensino bíblico mais acessível, prático e
        transformador. O nosso objetivo é ajudar cada pessoa a crescer no conhecimento da Palavra de
        Deus, com conteúdos claros, edificantes e centrados em Cristo.
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="border-orange/30 bg-orange/5 mt-16 flex flex-col items-center rounded-2xl border px-6 py-14 text-center sm:py-16"
      >
        <div
          aria-hidden="true"
          className="bg-orange/10 text-orange flex h-14 w-14 items-center justify-center rounded-full"
        >
          <Sparkles className="h-6 w-6" />
        </div>
        <h2 className="font-display text-ink mt-6 text-3xl font-medium sm:text-4xl">Em breve</h2>
        <p className="text-muted-foreground mt-4 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
          Os cursos estão a ser preparados. Em breve poderás aceder a todos os conteúdos do LOGOS a
          partir desta página.
        </p>
      </motion.div>
    </motion.section>
  );
}
