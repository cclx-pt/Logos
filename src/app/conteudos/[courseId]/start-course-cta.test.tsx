import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  signInWithGoogleAction: vi.fn(),
}));
vi.mock('@/lib/courses/access-actions', () => ({
  logCourseAccessAction: vi.fn(),
}));

import { StartCourseCta } from './start-course-cta';

const courseId = '11111111-1111-1111-1111-111111111111';
const lessonId = '22222222-2222-2222-2222-222222222222';
const lessonTitle = 'Introdução à Bíblia';

describe('StartCourseCta — V3.1 T7', () => {
  it('renderiza botão de login Google + next via data-next quando anónimo', () => {
    render(
      <StartCourseCta
        courseId={courseId}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        hasProgress={false}
        isAuthenticated={false}
      />,
    );
    const google = screen.getByRole('button', { name: /continuar com google/i });
    expect(google).toHaveAttribute('data-next', `/conteudos/${courseId}/${lessonId}`);
  });

  it('sem progresso: "Começar curso" com o nome da primeira aula', () => {
    render(
      <StartCourseCta
        courseId={courseId}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        hasProgress={false}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByRole('button', { name: /começar curso/i })).toBeInTheDocument();
    expect(screen.getByText(/primeira aula: introdução à bíblia/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inicia sessão/i })).not.toBeInTheDocument();
  });

  it('com progresso: "Continuar curso" com o nome da próxima aula não concluída', () => {
    render(
      <StartCourseCta
        courseId={courseId}
        lessonId={lessonId}
        lessonTitle={lessonTitle}
        hasProgress={true}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByRole('button', { name: /continuar curso/i })).toBeInTheDocument();
    expect(screen.getByText(/a seguir: introdução à bíblia/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /começar curso/i })).not.toBeInTheDocument();
  });
});
