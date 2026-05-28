'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { BookMarked, Check, Sparkles } from 'lucide-react';

import { CourseImage } from '@/lib/courses/course-image';
import { signInWithGoogleAction } from '@/lib/auth/actions';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';
import type { StartedCourse } from '@/lib/courses/started';

type Props = {
  isAuthenticated: boolean;
  courses: StartedCourse[];
};

function CourseCard({ course, completed }: { course: StartedCourse; completed: boolean }) {
  return (
    <Link
      href={`/conteudos/${course.id}`}
      className={
        completed
          ? 'border-border bg-card hover:border-orange-primary/40 focus-visible:ring-ring group flex h-full flex-col rounded-2xl border p-6 opacity-60 transition-all hover:opacity-100 focus-visible:ring-2 focus-visible:outline-none'
          : 'border-border bg-card hover:border-orange-primary/40 hover:bg-orange-primary/5 focus-visible:ring-ring group flex h-full flex-col rounded-2xl border p-6 transition-colors focus-visible:ring-2 focus-visible:outline-none'
      }
    >
      <CourseImage
        bannerUrl={course.bannerUrl}
        iconSlug={course.icon}
        alt={course.title}
        variant="card"
      />
      <div className="mt-5 flex flex-wrap items-start gap-2">
        <h2 className="font-display text-ink text-2xl font-medium tracking-tight">
          {course.title}
        </h2>
        {completed ? (
          <span className="border-sage-card bg-sage-card/40 text-ink inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            <Check className="h-3 w-3" aria-hidden="true" />
            Concluído
          </span>
        ) : (
          <span className="border-orange-primary/30 bg-orange-primary/10 text-orange-primary inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase">
            Em curso
          </span>
        )}
      </div>
      {course.description ? (
        <p className="text-muted-foreground mt-2 line-clamp-4 text-sm leading-relaxed">
          {course.description}
        </p>
      ) : null}
      <span className="text-orange-primary mt-auto pt-5 text-xs font-medium tracking-wide uppercase">
        {completed ? 'Rever curso →' : 'Continuar →'}
      </span>
    </Link>
  );
}

function CoursesGroups({ courses }: { courses: StartedCourse[] }) {
  const inProgress = courses.filter((c) => !c.completed);
  const completed = courses.filter((c) => c.completed);

  return (
    <>
      <motion.section
        variants={staggerItem}
        aria-labelledby="em-progresso-heading"
        className="mt-12"
      >
        <h2
          id="em-progresso-heading"
          className="font-display text-ink text-2xl font-medium tracking-tight sm:text-3xl"
        >
          Em progresso
        </h2>
        {inProgress.length > 0 ? (
          <ul
            aria-label="Cursos em progresso"
            className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {inProgress.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} completed={false} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-orange-primary/30 bg-orange-primary/5 mt-6 flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div
                aria-hidden="true"
                className="bg-orange-primary/10 text-orange-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              >
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-muted-foreground max-w-prose font-sans text-sm leading-relaxed sm:text-base">
                Não tens cursos em progresso. Visita o catálogo para começares mais um.
              </p>
            </div>
            <Link
              href="/conteudos"
              className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 shrink-0 items-center justify-center rounded-md px-5 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Ver catálogo →
            </Link>
          </div>
        )}
      </motion.section>

      {completed.length > 0 && (
        <motion.section
          variants={staggerItem}
          aria-labelledby="terminados-heading"
          className="mt-16"
        >
          <h2
            id="terminados-heading"
            className="font-display text-ink text-2xl font-medium tracking-tight sm:text-3xl"
          >
            Terminados
          </h2>
          <ul
            aria-label="Cursos terminados"
            className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {completed.map((course) => (
              <li key={course.id}>
                <CourseCard course={course} completed={true} />
              </li>
            ))}
          </ul>
        </motion.section>
      )}
    </>
  );
}

export function MeusCursosContent({ isAuthenticated, courses }: Props) {
  const isEmpty = courses.length === 0;

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
        Os meus cursos
      </motion.h1>

      {!isAuthenticated ? (
        <motion.div
          variants={staggerItem}
          className="border-orange-primary/30 bg-orange-primary/5 mt-12 flex flex-col items-center rounded-2xl border px-6 py-14 text-center sm:py-16"
        >
          <div
            aria-hidden="true"
            className="bg-orange-primary/10 text-orange-primary flex h-14 w-14 items-center justify-center rounded-full"
          >
            <BookMarked className="h-6 w-6" />
          </div>
          <h2 className="font-display text-ink mt-6 text-3xl font-medium sm:text-4xl">
            Inicia sessão para ver os teus cursos
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
            Aqui ficam guardados os cursos que começaste, ordenados pelo mais recente. Inicia sessão
            com a tua conta Google para começar.
          </p>
          <form action={signInWithGoogleAction} className="mt-8">
            <input type="hidden" name="next" value="/meus-cursos" />
            <button
              type="submit"
              className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              Inicia sessão com Google →
            </button>
          </form>
        </motion.div>
      ) : isEmpty ? (
        <motion.div
          variants={staggerItem}
          className="border-orange-primary/30 bg-orange-primary/5 mt-12 flex flex-col items-center rounded-2xl border px-6 py-14 text-center sm:py-16"
        >
          <div
            aria-hidden="true"
            className="bg-orange-primary/10 text-orange-primary flex h-14 w-14 items-center justify-center rounded-full"
          >
            <BookMarked className="h-6 w-6" />
          </div>
          <h2 className="font-display text-ink mt-6 text-3xl font-medium sm:text-4xl">
            Ainda não começaste nenhum curso
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
            Visita o catálogo e abre um curso para começares — voltas a encontrá-lo aqui.
          </p>
          <Link
            href="/conteudos"
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring mt-8 inline-flex h-11 items-center justify-center rounded-md px-6 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Ver catálogo →
          </Link>
        </motion.div>
      ) : (
        <CoursesGroups courses={courses} />
      )}
    </motion.section>
  );
}
