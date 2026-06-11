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

  it('mostra CTA de login Google quando anónimo (com next=/meus-cursos)', () => {
    render(<MeusCursosContent isAuthenticated={false} courses={[]} />);
    const google = screen.getByRole('button', { name: /continuar com google/i });
    expect(google).toHaveAttribute('data-next', '/meus-cursos');
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

describe('MeusCursosContent — secções "Em progresso" / "Terminados" (V3.2)', () => {
  it('renderiza só "Em progresso" quando todos os cursos são em curso', () => {
    render(
      <MeusCursosContent
        isAuthenticated={true}
        courses={[
          makeCourse({ id: 'aaaa', title: 'Marcos', completed: false }),
          makeCourse({ id: 'bbbb', title: 'Romanos', completed: false }),
        ]}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: /^em progresso$/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { level: 2, name: /^terminados$/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('list', { name: /cursos em progresso/i })).toBeInTheDocument();
  });

  it('renderiza ambas as secções quando há em-progresso e terminados', () => {
    render(
      <MeusCursosContent
        isAuthenticated={true}
        courses={[
          makeCourse({ id: 'aaaa', title: 'Marcos', completed: false }),
          makeCourse({ id: 'bbbb', title: 'Lucas', completed: true }),
        ]}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: /^em progresso$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /^terminados$/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /cursos em progresso/i })).toBeInTheDocument();
    expect(screen.getByRole('list', { name: /cursos terminados/i })).toBeInTheDocument();
  });

  it('mostra mensagem + link "Ver catálogo" dentro de "Em progresso" quando só há terminados', () => {
    render(
      <MeusCursosContent
        isAuthenticated={true}
        courses={[makeCourse({ id: 'aaaa', title: 'Lucas', completed: true })]}
      />,
    );
    expect(screen.getByRole('heading', { level: 2, name: /^em progresso$/i })).toBeInTheDocument();
    expect(screen.getByText(/não tens cursos em progresso/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ver catálogo/i })).toHaveAttribute(
      'href',
      '/conteudos',
    );
    expect(screen.getByRole('heading', { level: 2, name: /^terminados$/i })).toBeInTheDocument();
    // Não há grid de em-progresso (lista do role) quando não há cursos
    expect(screen.queryByRole('list', { name: /cursos em progresso/i })).not.toBeInTheDocument();
  });

  it('cards terminados aplicam opacity-60', () => {
    render(
      <MeusCursosContent
        isAuthenticated={true}
        courses={[makeCourse({ id: 'aaaa', title: 'Lucas', completed: true })]}
      />,
    );
    const link = screen.getByRole('link', { name: /lucas/i });
    expect(link.className).toMatch(/opacity-60/);
  });

  it('cards em-progresso não aplicam opacity-60', () => {
    render(
      <MeusCursosContent
        isAuthenticated={true}
        courses={[makeCourse({ id: 'aaaa', title: 'Marcos', completed: false })]}
      />,
    );
    const link = screen.getByRole('link', { name: /marcos/i });
    expect(link.className).not.toMatch(/opacity-60/);
  });
});
