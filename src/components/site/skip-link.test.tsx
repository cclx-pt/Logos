import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SkipLink } from './skip-link';

describe('SkipLink', () => {
  it('aponta para #main-content e tem texto PT-PT', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /saltar para o conteúdo/i });
    expect(link).toHaveAttribute('href', '#main-content');
  });

  it('está visualmente escondido por defeito (classe sr-only)', () => {
    render(<SkipLink />);
    const link = screen.getByRole('link', { name: /saltar para o conteúdo/i });
    expect(link.className).toMatch(/\bsr-only\b/);
    expect(link.className).toMatch(/focus:not-sr-only/);
  });
});
