'use client';

import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
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
        O Logos, o ministério de ensino da{' '}
        <span className="text-ink font-medium">CCLX — Comunidade Cristã Lisboa</span>, nasce com um
        propósito simples, mas essencial: levar a igreja a conhecer, amar e viver a Palavra de Deus.
      </motion.p>

      <motion.div variants={staggerItem} className="mt-8 space-y-6">
        <p className="text-muted-foreground font-sans leading-relaxed">
          O nome <span className="text-ink font-medium">Logos</span> não é apenas um nome. Vem do
          grego e significa «Palavra», mas também carrega a ideia de razão, verdade e expressão
          divina. Na Bíblia, aponta diretamente para Cristo como a Palavra viva de Deus — aquele que
          revela quem Deus é e dá sentido à nossa vida.
        </p>
        <p className="text-muted-foreground font-sans leading-relaxed">
          É exatamente isso que queremos construir. Queremos ser uma igreja que não apenas ouve a
          Palavra, mas que a conhece profundamente. Uma igreja que não apenas aprende, mas que se
          apaixona pelas Escrituras. Uma igreja que não apenas estuda, mas que vive aquilo que
          aprende. Acreditamos que uma fé sólida nasce de uma compreensão clara da Palavra e que uma
          vida transformada começa quando aquilo que entendemos passa a moldar quem somos.
        </p>
        <p className="text-muted-foreground font-sans leading-relaxed">
          Por isso, enquanto ministério, dedicamo-nos a criar espaços de ensino, partilha e
          crescimento, promovendo aulas, estudos e iniciativas que ajudam cada pessoa a aprofundar a
          sua relação com Deus através das Escrituras.
        </p>
      </motion.div>

      <motion.div variants={staggerItem} className="border-orange/50 mt-12 border-l-2 pl-6 sm:pl-8">
        <p className="font-display text-ink text-2xl leading-snug font-medium sm:text-3xl">
          Mais do que transmitir informação, queremos formar pessoas.
        </p>
        <p className="font-display text-ink mt-3 text-2xl leading-snug font-medium sm:text-3xl">
          Mais do que ensinar conteúdos, queremos despertar paixão.
        </p>
        <p className="font-display text-ink mt-3 text-2xl leading-snug font-medium sm:text-3xl">
          Mais do que estudar a Bíblia, queremos viver a Bíblia.
        </p>
      </motion.div>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-12 font-sans leading-relaxed"
      >
        Deus ricamente te abençoe,
        <br />
        <span className="text-ink font-medium">Logos</span>
      </motion.p>

      <motion.div
        variants={staggerItem}
        className="border-border bg-cream-card/60 mt-16 rounded-lg border p-6 sm:p-8"
      >
        <p className="text-muted-foreground font-sans leading-relaxed">
          Queres conhecer mais da CCLX?{' '}
          <a
            href={siteConfig.organization.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange hover:text-orange-hover focus-visible:ring-ring inline-flex items-center font-medium underline-offset-4 hover:underline focus-visible:rounded-xs focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Visita o site da igreja
            <ArrowUpRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </a>
        </p>
      </motion.div>
    </motion.section>
  );
}
