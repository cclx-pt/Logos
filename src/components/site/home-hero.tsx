'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { Logo } from './logo';
import { Button, buttonVariants } from '@/components/ui/button';
import { signInWithGoogleAction } from '@/lib/auth/actions';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

type HomeHeroProps = {
  /** Resolve no servidor a partir de `getCurrentUser()`. */
  isAuthenticated: boolean;
  /** Para onde levar o utilizador autenticado (e onde aterrar após login). */
  ctaHref: string;
};

export function HomeHero({ isAuthenticated, ctaHref }: HomeHeroProps) {
  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto flex max-w-4xl flex-col items-center px-4 py-20 text-center sm:px-6 sm:py-28 lg:py-32"
    >
      <motion.div variants={staggerItem}>
        <Logo size="xl" asStatic />
      </motion.div>

      <motion.h1
        variants={staggerItem}
        className="font-display text-ink mt-10 text-4xl leading-tight font-medium sm:text-5xl"
      >
        Estudo Bíblico para uma Fé Enraizada.
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-6 max-w-2xl text-center font-sans text-base leading-relaxed sm:text-lg"
      >
        O ministério LOGOS é o espaço da CCLX para crescer no conhecimento das Escrituras.
      </motion.p>

      <motion.div variants={staggerItem} className="mt-10 flex w-full justify-center">
        {isAuthenticated ? (
          <Link href={ctaHref} className={buttonVariants({ size: 'lg' })}>
            Meus cursos
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        ) : (
          <form action={signInWithGoogleAction}>
            <input type="hidden" name="next" value={ctaHref} />
            <Button type="submit" size="lg">
              Meus cursos
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
            </Button>
          </form>
        )}
      </motion.div>
    </motion.section>
  );
}
