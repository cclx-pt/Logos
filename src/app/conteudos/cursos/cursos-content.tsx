'use client';

import { motion } from 'motion/react';
import { BookOpen, FileDown, CheckCircle2 } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

const expectations = [
  {
    icon: BookOpen,
    title: 'Vídeo em qualquer dispositivo',
    body: 'As aulas chegam-te em vídeo embebido no site. Vês no telemóvel, no tablet ou no portátil; sem instalar nada.',
  },
  {
    icon: FileDown,
    title: 'Apostila para descarregar',
    body: 'Cada aula traz um PDF acompanhante para imprimires, anotares e guardares offline.',
  },
  {
    icon: CheckCircle2,
    title: 'O teu ritmo',
    body: 'Marcas como concluída quando achares bem. Sem prazos, sem barras de progresso, sem pressão. Voltas atrás quando precisares.',
  },
] as const;

export function CursosContent() {
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
        Cursos
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-8 font-sans text-lg leading-relaxed"
      >
        Em breve poderás explorar aqui o catálogo de cursos da CCLX. Conteúdo estruturado em cursos,
        módulos e aulas — vídeo embebido e apostila em PDF, sempre gratuitos.
      </motion.p>

      <motion.div variants={staggerItem} className="mt-12">
        <h2 className="font-display text-ink text-2xl font-medium">O que vais encontrar</h2>
        <ul className="mt-6 grid gap-6 sm:grid-cols-3">
          {expectations.map(({ icon: Icon, title, body }) => (
            <li
              key={title}
              className="border-border bg-background flex flex-col rounded-lg border p-5"
            >
              <Icon className="text-orange h-6 w-6" aria-hidden="true" />
              <h3 className="font-display text-ink mt-4 text-lg font-medium">{title}</h3>
              <p className="text-muted-foreground mt-2 font-sans text-sm leading-relaxed">{body}</p>
            </li>
          ))}
        </ul>
      </motion.div>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-16 font-sans text-xs tracking-[0.3em] uppercase"
      >
        Em breve
      </motion.p>
    </motion.section>
  );
}
