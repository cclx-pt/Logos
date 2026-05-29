import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import type { VisibleCourse } from '@/lib/courses/visibility';
import { ConteudosContent } from './conteudos-content';

function makeCourse(overrides: Partial<VisibleCourse> = {}): VisibleCourse {
  return {
    id: 'c1',
    title: 'Marcos — Introdução',
    description: 'Uma jornada de seis semanas pelo Evangelho de Marcos.',
    icon: 'book-open',
    bannerUrl: null,
    hasLessons: true,
    ...overrides,
  };
}

describe('ConteudosContent — sempre presente', () => {
  it('apresenta o heading "Conteúdos"', () => {
    render(<ConteudosContent courses={[]} query="" isAuthenticated={true} />);
    expect(screen.getByRole('heading', { level: 1, name: /^conteúdos$/i })).toBeInTheDocument();
  });

  it('apresenta o parágrafo intro do ministério', () => {
    render(<ConteudosContent courses={[]} query="" isAuthenticated={true} />);
    expect(
      screen.getByText(/Os nossos conteúdos foram desenvolvidos para fortalecer a igreja/i),
    ).toBeInTheDocument();
  });

  it('apresenta o form de pesquisa accessível', () => {
    render(<ConteudosContent courses={[]} query="" isAuthenticated={true} />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pesquisar/i })).toBeInTheDocument();
  });
});

describe('ConteudosContent — estado vazio sem filtro', () => {
  it('apresenta o bloco "Em breve" quando não há cursos visíveis', () => {
    render(<ConteudosContent courses={[]} query="" isAuthenticated={true} />);
    expect(screen.getByRole('heading', { level: 2, name: /^em breve$/i })).toBeInTheDocument();
    expect(screen.getByText(/Os cursos estão a ser preparados/i)).toBeInTheDocument();
  });

  it('não mostra link "Limpar" quando não há filtro activo', () => {
    render(<ConteudosContent courses={[]} query="" isAuthenticated={true} />);
    expect(screen.queryByRole('link', { name: /limpar/i })).not.toBeInTheDocument();
  });
});

describe('ConteudosContent — estado vazio com filtro', () => {
  it('apresenta "Sem resultados" quando o filtro não encontra cursos', () => {
    render(<ConteudosContent courses={[]} query="hebreu" isAuthenticated={true} />);
    expect(screen.getByRole('heading', { level: 2, name: /sem resultados/i })).toBeInTheDocument();
    expect(screen.getByText(/hebreu/i)).toBeInTheDocument();
  });

  it('mostra link "Limpar" quando há filtro activo', () => {
    render(<ConteudosContent courses={[]} query="hebreu" isAuthenticated={true} />);
    const limpar = screen.getByRole('link', { name: /limpar/i });
    expect(limpar).toBeInTheDocument();
    expect(limpar).toHaveAttribute('href', '/conteudos');
  });

  it('pré-popula o input de pesquisa com o termo actual', () => {
    render(<ConteudosContent courses={[]} query="marcos" isAuthenticated={true} />);
    expect(screen.getByRole('searchbox')).toHaveValue('marcos');
  });
});

describe('ConteudosContent — cards de cursos', () => {
  it('renderiza um card por curso visível com link para o courseId (UUID)', () => {
    const courses = [
      makeCourse({ id: 'a', title: 'Marcos', description: null }),
      makeCourse({ id: 'b', title: 'Romanos', description: null }),
    ];
    render(<ConteudosContent courses={courses} query="" isAuthenticated={true} />);
    expect(screen.getByRole('link', { name: /marcos/i })).toHaveAttribute('href', '/conteudos/a');
    expect(screen.getByRole('link', { name: /romanos/i })).toHaveAttribute('href', '/conteudos/b');
  });

  it('mostra badge "Em breve" e desativa o card quando hasLessons = false', () => {
    const courses = [makeCourse({ hasLessons: false, description: null })];
    render(<ConteudosContent courses={courses} query="" isAuthenticated={true} />);
    const card = screen.getByRole('link', { name: /marcos/i });
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).toHaveAttribute('tabindex', '-1');
    expect(screen.getByText(/em breve/i)).toBeInTheDocument();
  });

  it('não mostra badge "Em breve" quando hasLessons = true', () => {
    render(<ConteudosContent courses={[makeCourse({ hasLessons: true })]} query="" isAuthenticated={true} />);
    // Apenas o card está visível — não há heading "Em breve" nem badge.
    expect(screen.queryByText(/em breve/i)).not.toBeInTheDocument();
  });

  it('omite a descrição quando é null', () => {
    render(<ConteudosContent courses={[makeCourse({ description: null })]} query="" isAuthenticated={true} />);
    expect(screen.queryByText(/Uma jornada de seis semanas/i)).not.toBeInTheDocument();
  });

  it('nunca mostra a descrição no catálogo, mesmo que esteja presente (vive só na landing do curso)', () => {
    render(
      <ConteudosContent
        courses={[
          makeCourse({ description: 'Uma jornada de seis semanas pelo Evangelho de Marcos.' }),
        ]}
        query=""
        isAuthenticated={true}
      />,
    );
    expect(screen.queryByText(/Uma jornada de seis semanas/i)).not.toBeInTheDocument();
  });
});

describe('ConteudosContent — catálogo sem estado pessoal (V3.2)', () => {
  it('nunca mostra badge "Começado" nem "Concluído" (estado pessoal vive em /meus-cursos)', () => {
    render(<ConteudosContent courses={[makeCourse()]} query="" isAuthenticated={true} />);
    expect(screen.queryByText(/^começado$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^concluído$/i)).not.toBeInTheDocument();
  });

  it('mantém badge "Em breve" quando hasLessons=false', () => {
    render(<ConteudosContent courses={[makeCourse({ hasLessons: false })]} query="" isAuthenticated={true} />);
    expect(screen.getByText(/^em breve$/i)).toBeInTheDocument();
  });
});

describe('ConteudosContent — utilizador anónimo (V3.3 PR8)', () => {
  it('não mostra badge "Em breve" para anon (card é clicável; landing trata do login)', () => {
    render(
      <ConteudosContent
        courses={[makeCourse({ id: 'a', title: 'Marcos', hasLessons: false })]}
        query=""
        isAuthenticated={false}
      />,
    );
    expect(screen.queryByText(/em breve/i)).not.toBeInTheDocument();
    const card = screen.getByRole('link', { name: /marcos/i });
    expect(card).not.toHaveAttribute('aria-disabled');
    expect(card).not.toHaveAttribute('tabindex', '-1');
    expect(card).toHaveAttribute('href', '/conteudos/a');
  });

  it('mostra CTA "Ver curso →" mesmo em cursos sem aulas para anon', () => {
    render(
      <ConteudosContent
        courses={[makeCourse({ hasLessons: false })]}
        query=""
        isAuthenticated={false}
      />,
    );
    expect(screen.getByText(/ver curso/i)).toBeInTheDocument();
  });
});
