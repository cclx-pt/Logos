import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConteudosContent } from './conteudos-content';

describe('ConteudosContent', () => {
  it('apresenta o heading "Conteúdos"', () => {
    render(<ConteudosContent />);
    expect(screen.getByRole('heading', { level: 1, name: /^conteúdos$/i })).toBeInTheDocument();
  });

  it('apresenta o parágrafo intro do ministério', () => {
    render(<ConteudosContent />);
    expect(
      screen.getByText(/Os nossos conteúdos foram desenvolvidos para fortalecer a igreja/i),
    ).toBeInTheDocument();
  });

  it('apresenta o bloco "Em breve" com a mensagem de disponibilidade futura', () => {
    render(<ConteudosContent />);
    expect(screen.getByRole('heading', { level: 2, name: /^em breve$/i })).toBeInTheDocument();
    expect(screen.getByText(/Os cursos estão a ser preparados/i)).toBeInTheDocument();
  });
});
