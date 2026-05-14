'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';
import { siteConfig } from '@/lib/site-config';
import { cn } from '@/lib/utils';

type ContentSection = {
  href: string;
  icon: LucideIcon;
  title: string;
  body: string;
  /** Tonalidade do cartão — tokens vinculativos do branding. */
  surface: string;
  /** Etiqueta opcional no canto do cartão (ex.: "Em breve"). */
  badge?: string;
};

const sections: readonly ContentSection[] = [
  {
    href: '/conteudos/cursos',
    icon: BookOpen,
    title: 'Cursos',
    body: 'Estudo bíblico estruturado em cursos, módulos e aulas — vídeo embebido e apostila em PDF, ao teu ritmo.',
    surface: 'bg-cream-card',
  },
  {
    href: '/conteudos/escola-biblica',
    icon: GraduationCap,
    title: 'Escola Bíblica',
    body: 'As transmissões da Escola Bíblica da CCLX. Esta secção está em construção — chega numa versão futura.',
    surface: 'bg-sage-card',
    badge: 'Em breve',
  },
] as const;

export function ConteudosContent() {
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
        Conteúdos
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-8 font-sans text-lg leading-relaxed"
      >
        Os nossos conteúdos foram desenvolvidos para fortalecer a igreja e aprofundar o amor pelas
        Escrituras. Disponibilizamos diferentes formatos — aulas gravadas, apostilas, materiais de
        apoio e outros recursos pensados para tornar o ensino bíblico mais acessível, prático e
        transformador. O nosso objetivo é ajudar cada pessoa a crescer no conhecimento da Palavra de
        Deus, com conteúdos claros, edificantes e centrados em Cristo.
      </motion.p>

      <motion.ul variants={staggerItem} className="mt-12 grid gap-6 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, body, surface, badge }) => (
          <li key={href}>
            <Link
              href={href}
              className={cn(
                'focus-visible:ring-ring group relative flex h-full flex-col rounded-xl p-6 transition-shadow focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none sm:p-8',
                surface,
                'hover:shadow-md',
              )}
            >
              {badge && (
                <span className="bg-cream-bg/70 text-muted-foreground absolute top-4 right-4 rounded-full px-3 py-1 font-sans text-xs tracking-[0.15em] uppercase">
                  {badge}
                </span>
              )}
              <Icon className="text-orange h-8 w-8" aria-hidden="true" />
              <h2 className="font-display text-ink mt-5 text-2xl font-medium">{title}</h2>
              <p className="text-muted-foreground mt-3 flex-1 font-sans text-sm leading-relaxed">
                {body}
              </p>
              <span className="text-orange mt-6 inline-flex items-center font-sans text-sm font-medium">
                Explorar
                <ArrowRight
                  className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
      </motion.ul>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-16 font-sans text-sm leading-relaxed"
      >
        Tens alguma dúvida ou gostavas de perceber melhor como tudo funciona? Entra em contacto
        connosco através de{' '}
        <a
          href={`mailto:${siteConfig.organization.email}`}
          className="text-orange hover:text-orange-hover font-medium underline-offset-4 hover:underline"
        >
          {siteConfig.organization.email}
        </a>
        .
      </motion.p>
    </motion.section>
  );
}
