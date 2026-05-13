import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConheceNosContent } from './conhece-nos-content';

describe('ConheceNosContent', () => {
  it('apresenta heading principal e identifica a CCLX', () => {
    render(<ConheceNosContent />);
    expect(screen.getByRole('heading', { level: 1, name: /conhece-nos/i })).toBeInTheDocument();
    expect(screen.getByText(/CCLX — Comunidade Cristã Lisboa/)).toBeInTheDocument();
  });

  it('expõe sub-secções "O que aqui encontras" e "Quem está por trás"', () => {
    render(<ConheceNosContent />);
    expect(
      screen.getByRole('heading', { level: 2, name: /o que aqui encontras/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /quem está por trás/i }),
    ).toBeInTheDocument();
  });
});
