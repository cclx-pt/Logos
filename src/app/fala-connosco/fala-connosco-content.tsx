'use client';

import { motion } from 'motion/react';
import { Mail, Globe } from 'lucide-react';
import { siteConfig } from '@/lib/site-config';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';

export function FalaConnoscoContent() {
  const mailto = `mailto:${siteConfig.organization.email}?subject=${encodeURIComponent('Contacto Logos')}`;

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
        Fala connosco
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-8 font-sans text-lg leading-relaxed"
      >
        Tens uma sugestão ou queres saber mais sobre a CCLX? Escreve-nos — lemos tudo.
      </motion.p>

      <motion.div variants={staggerItem} className="mt-12 grid gap-4 sm:grid-cols-2">
        <a
          href={mailto}
          className="border-border bg-background hover:border-orange focus-visible:ring-ring group flex items-start gap-4 rounded-lg border p-5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Mail className="text-orange mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-display text-ink text-lg font-medium">Email</p>
            <p className="group-hover:text-ink text-muted-foreground mt-1 font-sans text-sm break-all">
              {siteConfig.organization.email}
            </p>
          </div>
        </a>

        <a
          href={siteConfig.organization.website}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-background hover:border-orange focus-visible:ring-ring group flex items-start gap-4 rounded-lg border p-5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          <Globe className="text-orange mt-0.5 h-6 w-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-display text-ink text-lg font-medium">Site da igreja</p>
            <p className="group-hover:text-ink text-muted-foreground mt-1 font-sans text-sm">
              {siteConfig.organization.fullName}
            </p>
          </div>
        </a>
      </motion.div>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-16 font-sans text-xs tracking-[0.25em] uppercase"
      >
        Horários e morada da igreja em breve
      </motion.p>
    </motion.section>
  );
}
