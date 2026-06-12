import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import type { ModuleWithLessons } from '@/lib/courses/detail';
import { LessonTree } from './lesson-tree';

const COURSE_ID = 'c1';

function modules(): ModuleWithLessons[] {
  return [
    {
      id: 'm1',
      title: 'Módulo Um',
      description: null,
      position: 0,
      lessons: [
        { id: 'l1', title: 'Aula Um', description: null, template: 'pdf', position: 0 },
        { id: 'l2', title: 'Aula Dois', description: null, template: 'video', position: 1 },
      ],
    },
    {
      id: 'm2',
      title: 'Módulo Dois',
      description: null,
      position: 1,
      lessons: [
        { id: 'l3', title: 'Aula Três', description: null, template: 'video_pdf', position: 0 },
      ],
    },
  ];
}

describe('LessonTree', () => {
  it('renderiza módulos e aulas com links para o leitor', () => {
    render(
      <LessonTree
        courseId={COURSE_ID}
        modules={modules()}
        completedLessonIds={new Set()}
        currentLessonId="l1"
        currentModuleId="m1"
      />,
    );
    expect(screen.getByText('Módulo Um')).toBeInTheDocument();
    expect(screen.getByText('Módulo Dois')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Aula Três/ })).toHaveAttribute(
      'href',
      `/conteudos/${COURSE_ID}/l3`,
    );
  });

  it('marca a aula atual com aria-current="page"', () => {
    render(
      <LessonTree
        courseId={COURSE_ID}
        modules={modules()}
        completedLessonIds={new Set()}
        currentLessonId="l2"
        currentModuleId="m1"
      />,
    );
    expect(screen.getByRole('link', { name: /Aula Dois/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: /Aula Um/ })).not.toHaveAttribute('aria-current');
  });

  it('mostra ✓ nas aulas concluídas', () => {
    render(
      <LessonTree
        courseId={COURSE_ID}
        modules={modules()}
        completedLessonIds={new Set(['l1'])}
        currentLessonId="l2"
        currentModuleId="m1"
      />,
    );
    // O ✓ tem aria-label "Concluída"; só a aula l1 está concluída.
    expect(screen.getAllByLabelText('Concluída')).toHaveLength(1);
  });
});
