import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('apresenta o heading principal de boas-vindas', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/estudo bíblico/i);
  });

  it('mostra o wordmark Logos no hero', () => {
    render(<Home />);
    expect(screen.getByLabelText('Logos')).toBeInTheDocument();
  });

  it('expõe CTAs para /conteudos e /conhece-nos', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: /ver conteúdos/i })).toHaveAttribute(
      'href',
      '/conteudos',
    );
    expect(screen.getByRole('link', { name: /conhece o projeto/i })).toHaveAttribute(
      'href',
      '/conhece-nos',
    );
  });
});
