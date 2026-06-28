import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ProgressBar } from './progress-bar';

describe('ProgressBar (indeterminada)', () => {
  it('expõe role="progressbar" com aria-label default', () => {
    render(<ProgressBar />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-label', 'Em progresso');
  });

  it('aceita label custom', () => {
    render(<ProgressBar label="A enviar PDF" />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'A enviar PDF');
  });

  it('não declara aria-valuenow (indicador de indeterminada)', () => {
    render(<ProgressBar />);
    expect(screen.getByRole('progressbar')).not.toHaveAttribute('aria-valuenow');
  });
});
