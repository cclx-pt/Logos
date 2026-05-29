'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowDownAZ, ArrowUpAZ, ChevronDown, Search, Sparkles } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CourseCard } from '@/components/site/course-card';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';
import type { VisibleCourse } from '@/lib/courses/visibility';
import type { SortKey } from '@/lib/courses/sort';

type Props = {
  courses: VisibleCourse[];
  /** Termo de pesquisa actual (trimmed). Vazio se não há filtro. */
  query: string;
  /**
   * Se o utilizador está autenticado. Usado pelo `CourseCard` para decidir
   * se aplica o estado "Em breve" (cursos sem aulas) — para anon, todos os
   * cards são clicáveis (clicar leva à landing → CTA de login).
   */
  isAuthenticated: boolean;
  /**
   * IDs de cursos que o utilizador actual já concluiu. Cards correspondentes
   * ganham greyout + badge "Concluído" + CTA "Rever curso →" — mesma UX
   * da secção "Terminados" em `/meus-cursos`. Vazio para anon ou sem
   * conclusões.
   */
  completedCourseIds: string[];
  /**
   * Chave de ordenação activa (já aplicada no server). Controla o estado
   * inicial do dropdown.
   */
  sortKey: SortKey;
};

type SortOption = {
  value: SortKey;
  label: string;
  /** Se `authOnly`, só aparece para utilizadores autenticados. */
  authOnly?: boolean;
};

const SORT_OPTIONS: SortOption[] = [
  { value: 'por-comecar', label: 'Por começar primeiro', authOnly: true },
  { value: 'concluidos', label: 'Concluídos primeiro', authOnly: true },
  { value: 'a-z', label: 'A → Z' },
  { value: 'z-a', label: 'Z → A' },
];

const SORT_LABEL: Record<SortKey, string> = {
  'por-comecar': 'Por começar',
  concluidos: 'Concluídos',
  'a-z': 'A → Z',
  'z-a': 'Z → A',
};

export function ConteudosContent({
  courses,
  query,
  isAuthenticated,
  completedCourseIds,
  sortKey,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completedSet = new Set(completedCourseIds);
  const isFiltering = query.length > 0;
  const hasResults = courses.length > 0;

  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set('ordenar', value);
    router.push(`/conteudos?${params.toString()}`, { scroll: false });
  }

  const visibleSortOptions = SORT_OPTIONS.filter(
    (opt) => !opt.authOnly || isAuthenticated,
  );
  const sortIcon = sortKey === 'z-a' ? ArrowUpAZ : ArrowDownAZ;
  const SortIcon = sortIcon;

  return (
    <motion.section
      variants={staggerContainer}
      initial="hidden"
      animate="show"
      className="w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-12 lg:py-24 xl:px-16"
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
        {/*
          Preserva `?ordenar=` quando o utilizador submete a pesquisa — sem este
          hidden, ao submeter o form perderíamos a ordenação actual.
        */}
        <input type="hidden" name="ordenar" value={sortKey} />
        {isFiltering ? (
          <Link
            href={`/conteudos?ordenar=${sortKey}`}
            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Limpar
          </Link>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
            <SortIcon aria-hidden="true" className="h-4 w-4" />
            <span className="hidden sm:inline">Ordenar:</span>
            <span>{SORT_LABEL[sortKey]}</span>
            <ChevronDown aria-hidden="true" className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={6} className="min-w-56">
            <DropdownMenuRadioGroup value={sortKey} onValueChange={handleSortChange}>
              {visibleSortOptions.map((opt) => (
                <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                  {opt.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.form>

      {hasResults ? (
        <motion.ul
          variants={staggerItem}
          aria-label="Cursos disponíveis"
          className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {courses.map((course) => (
            <li key={course.id}>
              <CourseCard
                course={course}
                variant="catalog"
                isAuthenticated={isAuthenticated}
                isCompleted={completedSet.has(course.id)}
              />
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
