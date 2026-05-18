'use client';

import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

const mottoLines = [
  'Mais do que transmitir informação, queremos formar pessoas.',
  'Mais do que ensinar conteúdos, queremos despertar paixão.',
  'Mais do que estudar a Bíblia, queremos viver a Bíblia.',
] as const;

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

      <motion.div
        variants={staggerItem}
        className="text-ink/85 mt-10 space-y-6 font-sans text-lg leading-relaxed"
      >
        <p className="text-justify hyphens-auto">
          O LOGOS é o ministério de ensino da CCLX. Nasce com um propósito simples, mas essencial:
          levar a igreja a conhecer, amar e viver a Palavra de Deus.
        </p>

        <p className="text-justify hyphens-auto">
          O nome &ldquo;Logos&rdquo; não é apenas um nome. Vem do grego e significa
          &ldquo;Palavra&rdquo;, mas também carrega a ideia de razão, verdade e expressão divina. Na
          Bíblia, aponta diretamente para Cristo como a Palavra viva de Deus, aquele que revela quem
          Deus é e dá sentido à nossa vida.
        </p>

        <p className="text-justify hyphens-auto">
          É exatamente isso que queremos construir. Queremos ser uma igreja que não apenas ouve a
          Palavra, mas que a conhece profundamente. Uma igreja que não apenas aprende, mas que se
          apaixona pelas Escrituras. Uma igreja que não apenas estuda, mas que vive aquilo que
          aprende. Acreditamos que uma fé sólida nasce de uma compreensão clara da Palavra e que uma
          vida transformada começa quando aquilo que entendemos passa a moldar quem somos.
        </p>

        <p className="text-justify hyphens-auto">
          Por isso, enquanto ministério, dedicamo-nos a criar espaços de ensino, partilha e
          crescimento, promovendo aulas, estudos e iniciativas que ajudam cada pessoa a aprofundar a
          sua relação com Deus através das Escrituras.
        </p>
      </motion.div>

      <motion.aside
        variants={staggerItem}
        aria-label="Lema do ministério LOGOS"
        className="border-orange/30 mt-12 space-y-3 border-y py-10 text-center sm:py-12"
      >
        {mottoLines.map((line) => (
          <p
            key={line}
            className="font-display text-ink text-xl leading-relaxed italic sm:text-2xl"
          >
            {line}
          </p>
        ))}
      </motion.aside>

      <motion.div
        variants={staggerItem}
        className="text-ink/85 mt-12 font-sans text-lg leading-relaxed"
      >
        <p>Deus ricamente te abençoe,</p>
        <p className="font-display text-ink mt-1 text-2xl font-medium tracking-wide">LOGOS</p>
      </motion.div>
    </motion.section>
  );
}
