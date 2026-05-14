import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConteudosContent } from './conteudos-content';

describe('ConteudosContent', () => {
  it('apresenta o heading "Conteúdos"', () => {
    render(<ConteudosContent />);
    expect(screen.getByRole('heading', { level: 1, name: /^conteúdos$/i })).toBeInTheDocument();
  });

  it('mostra os dois cartões: Cursos e Escola Bíblica, com os destinos certos', () => {
    render(<ConteudosContent />);
    expect(screen.getByRole('heading', { level: 2, name: /^cursos$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /^escola bíblica$/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cursos/i })).toHaveAttribute(
      'href',
      '/conteudos/cursos',
    );
    expect(screen.getByRole('link', { name: /escola bíblica/i })).toHaveAttribute(
      'href',
      '/conteudos/escola-biblica',
    );
  });

  it('assinala a Escola Bíblica como "Em breve"', () => {
    render(<ConteudosContent />);
    expect(screen.getByText(/^em breve$/i)).toBeInTheDocument();
  });

  it('expõe o contacto do ministério via mailto', () => {
    render(<ConteudosContent />);
    const emailLink = screen.getByRole('link', { name: /logos@cclx\.pt/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:logos@cclx.pt');
  });
});
