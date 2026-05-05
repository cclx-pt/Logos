import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Home from './page';

describe('Home', () => {
  it('renderiza o wordmark LOGOS com aria-label correto', () => {
    render(<Home />);
    const heading = screen.getByRole('heading', { level: 1, name: 'Logos' });
    expect(heading).toHaveTextContent('LOGOS');
  });

  it('exibe a legenda "Em construção"', () => {
    render(<Home />);
    expect(screen.getByText('Em construção')).toBeInTheDocument();
  });
});
