'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';

import { CourseCard } from '@/components/site/course-card';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';
import type { VisibleCourse } from '@/lib/courses/visibility';

type Props = {
  courses: VisibleCourse[];
  /** Termo de pesquisa actual (trimmed). Vazio se não há filtro. */
  query: string;
};

export function ConteudosContent({ courses, query }: Props) {
  const isFiltering = query.length > 0;
  const hasResults = courses.length > 0;

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:py-24"
    >
      <motion.h1
        variants={staggerItem}
        className="font-display text-ink text-4xl font-medium sm:text-5xl"
      >
        Conteúdos
      </motion.h1>

      <motion.p
        variants={staggerItem}
        className="text-muted-foreground mt-8 max-w-3xl text-justify font-sans text-lg leading-relaxed hyphens-auto"
      >
        Os nossos conteúdos foram desenvolvidos para fortalecer a igreja e aprofundar o amor pelas
        Escrituras. Disponibilizamos diferentes formatos, aulas gravadas, apostilas, materiais de
        apoio e outros recursos pensados para tornar o ensino bíblico mais acessível, prático e
        transformador. O nosso objetivo é ajudar cada pessoa a crescer no conhecimento da Palavra de
        Deus, com conteúdos claros, edificantes e centrados em Cristo.
      </motion.p>

      <motion.form
        variants={staggerItem}
        method="get"
        action="/conteudos"
        role="search"
        aria-label="Pesquisar cursos"
        className="mt-12 flex flex-wrap gap-3"
      >
        <label className="relative min-w-[200px] flex-1">
          <span className="sr-only">Pesquisar curso pelo título</span>
          <Search
            aria-hidden="true"
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
          />
          <input
            type="search"
            name="q"
            defaultValue={query}
            maxLength={80}
            placeholder="Pesquisar por título..."
            className="border-border bg-background text-ink focus-visible:ring-ring h-11 w-full rounded-md border pr-3 pl-9 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
        <button
          type="submit"
          className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          Pesquisar
        </button>
        {isFiltering ? (
          <Link
            href="/conteudos"
            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Limpar
          </Link>
        ) : null}
      </motion.form>

      {hasResults ? (
        <motion.ul
          variants={staggerItem}
          aria-label="Cursos disponíveis"
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard course={course} variant="catalog" />
            </li>
          ))}
        </motion.ul>
      ) : (
        <motion.div
          variants={staggerItem}
          className="border-orange-primary/30 bg-orange-primary/5 mt-12 flex flex-col items-center rounded-2xl border px-6 py-14 text-center sm:py-16"
        >
          <div
            aria-hidden="true"
            className="bg-orange-primary/10 text-orange-primary flex h-14 w-14 items-center justify-center rounded-full"
          >
            <Sparkles className="h-6 w-6" />
          </div>
          <h2 className="font-display text-ink mt-6 text-3xl font-medium sm:text-4xl">
            {isFiltering ? 'Sem resultados' : 'Em breve'}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
            {isFiltering ? (
              <>
                Não encontrámos nenhum curso para <strong>“{query}”</strong>. Experimenta outro
                termo ou limpa a pesquisa.
              </>
            ) : (
              'Os cursos estão a ser preparados. Em breve poderás aceder a todos os conteúdos do LOGOS a partir desta página.'
            )}
          </p>
        </motion.div>
      )}
    </motion.section>
  );
}
