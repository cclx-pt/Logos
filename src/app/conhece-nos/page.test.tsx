import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ConheceNosContent } from './conhece-nos-content';

describe('ConheceNosContent', () => {
  it('apresenta heading principal "Conhece-nos"', () => {
    render(<ConheceNosContent />);
    expect(screen.getByRole('heading', { level: 1, name: /conhece-nos/i })).toBeInTheDocument();
  });

  it('identifica LOGOS como ministério de ensino da CCLX — Comunidade Cristã de Lisboa', () => {
    render(<ConheceNosContent />);
    expect(
      screen.getByText(/ministério de ensino da CCLX.*Comunidade Cristã de Lisboa/i),
    ).toBeInTheDocument();
  });

  it('explica a etimologia do nome a partir do grego', () => {
    render(<ConheceNosContent />);
    expect(screen.getByText(/Vem do grego e significa/i)).toBeInTheDocument();
  });

  it('inclui o lema do ministério em itálico, identificado por aria-label', () => {
    render(<ConheceNosContent />);
    expect(screen.getByLabelText(/Lema do ministério LOGOS/i)).toBeInTheDocument();
    expect(screen.getByText(/queremos viver a Bíblia/i)).toBeInTheDocument();
  });

  it('fecha com a despedida "Deus ricamente te abençoe,"', () => {
    render(<ConheceNosContent />);
    expect(screen.getByText(/Deus ricamente te abençoe/i)).toBeInTheDocument();
  });

  it('assina como "Ministério LOGOS"', () => {
    render(<ConheceNosContent />);
    expect(screen.getByText(/^Ministério LOGOS$/)).toBeInTheDocument();
  });
});
