'use client';

import Link from 'next/link';
import { motion } from 'motion/react';

import { CourseCard } from '@/components/site/course-card';
import { SignInCta } from '@/components/site/sign-in-cta';
import { staggerContainer, staggerItem } from '@/lib/motion-variants';
import type { StartedCourse } from '@/lib/courses/started';

type Props = {
  isAuthenticated: boolean;
  courses: StartedCourse[];
};

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
                <CourseCard course={course} variant="in-progress" />
              </li>
            ))}
          </ul>
        ) : (
          <div className="border-orange-primary/30 bg-orange-primary/5 mt-6 flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground max-w-prose font-sans text-sm leading-relaxed sm:text-base">
              Não tens cursos em progresso. Visita o catálogo para começares mais um.
            </p>
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
                <CourseCard course={course} variant="completed" />
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
          <h2 className="font-display text-ink text-3xl font-medium sm:text-4xl">
            Inicia sessão para ver os teus cursos
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
            Aqui ficam guardados os cursos que já começaste. Inicia sessão para começar.
          </p>
          <SignInCta next="/meus-cursos" className="mt-8" />
        </motion.div>
      ) : isEmpty ? (
        <motion.div
          variants={staggerItem}
          className="border-orange-primary/30 bg-orange-primary/5 mt-12 flex flex-col items-center rounded-2xl border px-6 py-14 text-center sm:py-16"
        >
          <h2 className="font-display text-ink text-3xl font-medium sm:text-4xl">
            Ainda não começaste nenhum curso
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl font-sans text-base leading-relaxed sm:text-lg">
            Aqui ficam guardados os cursos que começaste, ordenados pelo mais recente.
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
