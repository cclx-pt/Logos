import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  signInWithGoogleAction: vi.fn(),
  signInWithMicrosoftAction: vi.fn(),
}));
vi.mock('@/lib/courses/access-actions', () => ({
  logCourseAccessAction: vi.fn(),
}));

import { StartCourseCta } from './start-course-cta';

const courseId = '11111111-1111-1111-1111-111111111111';
const firstLessonId = '22222222-2222-2222-2222-222222222222';

describe('StartCourseCta — V3.1 T7', () => {
  it('renderiza botões de login (Google + Microsoft) + hidden next quando anónimo', () => {
    render(
      <StartCourseCta
        courseId={courseId}
        firstLessonId={firstLessonId}
        hasProgress={false}
        isAuthenticated={false}
      />,
    );
    const google = screen.getByRole('button', { name: /continuar com google/i });
    expect(google).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar com microsoft/i })).toBeInTheDocument();
    const form = google.closest('form');
    expect(form).not.toBeNull();
    const hidden = form?.querySelector('input[name="next"]');
    expect(hidden).toHaveAttribute('value', `/conteudos/${courseId}/${firstLessonId}`);
    expect(hidden).toHaveAttribute('type', 'hidden');
  });

  it('renderiza "Começar curso" quando autenticado sem progresso', () => {
    render(
      <StartCourseCta
        courseId={courseId}
        firstLessonId={firstLessonId}
        hasProgress={false}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByRole('button', { name: /começar curso/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /inicia sessão/i })).not.toBeInTheDocument();
  });

  it('renderiza "Continuar curso" quando autenticado com progresso', () => {
    render(
      <StartCourseCta
        courseId={courseId}
        firstLessonId={firstLessonId}
        hasProgress={true}
        isAuthenticated={true}
      />,
    );
    expect(screen.getByRole('button', { name: /continuar curso/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /começar curso/i })).not.toBeInTheDocument();
  });
});
