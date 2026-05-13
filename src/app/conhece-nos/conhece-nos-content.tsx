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
        className="text-muted-foreground mt-8 font-sans text-lg leading-relaxed"
      >
        Somos a <span className="text-ink font-medium">CCLX — Comunidade Cristã Lisboa</span>, uma
        igreja em Lisboa que acredita que o estudo cuidadoso das Escrituras alimenta a fé. O Logos é
        o nosso espaço online para esse estudo.
      </motion.p>

      <motion.div variants={staggerItem} className="mt-12 space-y-6">
        <h2 className="font-display text-ink text-2xl font-medium">O que aqui encontras</h2>
        <p className="text-muted-foreground font-sans leading-relaxed">
          Cursos estruturados em vídeo, com apostilas em PDF para descarregar e levar contigo. Cada
          aula tem o seu ritmo — vês quando podes, voltas atrás quando precisas, marcas como
          concluída quando achares bem. Sem prazos, sem barras de progresso, sem distrações.
        </p>
        <p className="text-muted-foreground font-sans leading-relaxed">
          Tudo é, e será sempre, <span className="text-ink font-medium">gratuito</span>. Não há
          subscrições, não há paywalls, não há pedidos de donativo no caminho. Se queres apoiar a
          CCLX, fala connosco diretamente.
        </p>
      </motion.div>

      <motion.div variants={staggerItem} className="mt-12 space-y-6">
        <h2 className="font-display text-ink text-2xl font-medium">Quem está por trás</h2>
        <p className="text-muted-foreground font-sans leading-relaxed">
          Uma equipa pequena de voluntários da CCLX. Quem ensina nos cursos vem da própria
          comunidade — pastores, líderes e membros que querem partilhar o que estudaram. Quem mantém
          a plataforma a funcionar também.
        </p>
      </motion.div>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-16 font-sans text-xs tracking-[0.25em] uppercase"
      >
        Em construção — texto definitivo em breve
      </motion.p>
    </motion.section>
  );
}
