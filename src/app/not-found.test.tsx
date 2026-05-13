import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import NotFound from './not-found';

describe('NotFound', () => {
  it('apresenta heading 404 em PT-PT', () => {
    render(<NotFound />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/página não encontrada/i);
  });

  it('oferece CTAs para Home e Cursos', () => {
    render(<NotFound />);
    expect(screen.getByRole('link', { name: /voltar ao início/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /ver cursos/i })).toHaveAttribute('href', '/cursos');
  });
});
