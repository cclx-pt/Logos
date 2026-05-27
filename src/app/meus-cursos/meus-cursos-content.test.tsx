import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  signInWithGoogleAction: vi.fn(),
}));

import { MeusCursosContent } from './meus-cursos-content';
import type { StartedCourse } from '@/lib/courses/started';

function makeCourse(overrides: Partial<StartedCourse> = {}): StartedCourse {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    title: 'Marcos',
    description: 'Curso de Marcos',
    icon: 'cross',
    bannerUrl: null,
    hasLessons: true,
    completed: false,
    lastAccessedAt: '2026-05-25T10:00:00Z',
    ...overrides,
  };
}

describe('MeusCursosContent — V3.1 T4', () => {
  it('renderiza sempre o heading "Os meus cursos"', () => {
    render(<MeusCursosContent isAuthenticated={false} courses={[]} />);
    expect(
      screen.getByRole('heading', { level: 1, name: /^os meus cursos$/i }),
    ).toBeInTheDocument();
  });

  it('mostra CTA de login quando anónimo (com next=/meus-cursos)', () => {
    render(<MeusCursosContent isAuthenticated={false} courses={[]} />);
    const button = screen.getByRole('button', { name: /inicia sessão com google/i });
    expect(button).toBeInTheDocument();
    const form = button.closest('form');
    const hidden = form?.querySelector('input[name="next"]');
    expect(hidden).toHaveAttribute('value', '/meus-cursos');
    // Estado anónimo não deve mostrar grid nem link para o catálogo
    expect(screen.queryByRole('link', { name: /ver catálogo/i })).not.toBeInTheDocument();
  });

  it('mostra estado vazio + link "Ver catálogo" quando autenticado mas sem cursos', () => {
    render(<MeusCursosContent isAuthenticated={true} courses={[]} />);
    expect(
      screen.getByRole('heading', { level: 2, name: /ainda não começaste nenhum curso/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      '/conteudos',
    );
    expect(screen.queryByRole('button', { name: /inicia sessão/i })).not.toBeInTheDocument();
  });

  it('renderiza grid de cursos com link para /conteudos/<id>', () => {
    render(
      <MeusCursosContent
        isAuthenticated={true}
        courses={[makeCourse({ id: 'aaaa', title: 'Romanos' })]}
      />,
    );
    const link = screen.getByRole('link', { name: /romanos/i });
    expect(link).toHaveAttribute('href', '/conteudos/aaaa');
  });

  it('mostra badge "Em curso" quando completed=false', () => {
    render(
      <MeusCursosContent isAuthenticated={true} courses={[makeCourse({ completed: false })]} />,
    );
    expect(screen.getByText(/^em curso$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^concluído$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/continuar →/i)).toBeInTheDocument();
  });

  it('mostra badge "Concluído" + label "Rever curso" quando completed=true', () => {
    render(
      <MeusCursosContent isAuthenticated={true} courses={[makeCourse({ completed: true })]} />,
    );
    expect(screen.getByText(/^concluído$/i)).toBeInTheDocument();
    expect(screen.queryByText(/^em curso$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/rever curso →/i)).toBeInTheDocument();
  });
});
