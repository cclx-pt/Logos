import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { Spinner } from './spinner';

describe('Spinner', () => {
  it('expõe role="status" e label sr-only acessível', () => {
    render(<Spinner />);
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveTextContent(/a carregar/i);
  });

  it('aceita label custom', () => {
    render(<Spinner label="A enviar PDF" />);
    expect(screen.getByRole('status')).toHaveTextContent(/a enviar pdf/i);
  });

  it('aplica className extra ao wrapper', () => {
    render(<Spinner className="text-orange-primary" />);
    expect(screen.getByRole('status').className).toMatch(/text-orange-primary/);
  });
});
