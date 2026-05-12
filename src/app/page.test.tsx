import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('apresenta o heading principal de boas-vindas', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/estudo bíblico/i);
  });

  it('mostra o wordmark LOGOS no hero', () => {
    render(<Home />);
    expect(screen.getByLabelText('Logos')).toHaveTextContent('LOGOS');
  });

  it('expõe CTAs para /cursos e /conhece-nos', () => {
    render(<Home />);
    expect(screen.getByRole('link', { name: /ver cursos/i })).toHaveAttribute('href', '/cursos');
    expect(screen.getByRole('link', { name: /conhece o projeto/i })).toHaveAttribute(
      'href',
      '/conhece-nos',
    );
  });
});
