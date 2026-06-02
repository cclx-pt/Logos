'use client';

import { motion } from 'motion/react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

const lines = [
  'Mais do que transmitir informação, queremos formar pessoas.',
  'Mais do que ensinar conteúdos, queremos despertar paixão.',
  'Mais do que estudar a Bíblia, queremos viver a Bíblia.',
] as const;

export function HomeMotto() {
  return (
    <motion.aside
      aria-label="Lema do ministério LOGOS"
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-3xl px-4 pb-16 text-center sm:px-6 sm:pb-20 lg:pb-24"
    >
      <div className="border-orange/30 mx-auto max-w-2xl space-y-4 border-y py-10 sm:py-12">
        {lines.map((line) => (
          <motion.p
            key={line}
            variants={staggerItem}
            className="font-display text-ink text-xl leading-relaxed italic sm:text-2xl"
          >
            {line}
          </motion.p>
        ))}
      </div>
    </motion.aside>
  );
}
