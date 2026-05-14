import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConheceNosContent } from './conhece-nos-content';

describe('ConheceNosContent', () => {
  it('apresenta heading principal e identifica a CCLX', () => {
    render(<ConheceNosContent />);
    expect(screen.getByRole('heading', { level: 1, name: /conhece-nos/i })).toBeInTheDocument();
    expect(screen.getByText(/CCLX — Comunidade Cristã Lisboa/)).toBeInTheDocument();
  });

  it('apresenta o propósito e o manifesto do ministério Logos', () => {
    render(<ConheceNosContent />);
    expect(screen.getByText(/conhecer, amar e viver a Palavra de Deus/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Mais do que estudar a Bíblia, queremos viver a Bíblia/i),
    ).toBeInTheDocument();
  });

  it('liga ao site da CCLX em nova aba com rel seguro', () => {
    render(<ConheceNosContent />);
    const churchLink = screen.getByRole('link', { name: /visita o site da igreja/i });
    expect(churchLink).toHaveAttribute('href', 'https://cclx.pt');
    expect(churchLink).toHaveAttribute('target', '_blank');
    expect(churchLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
