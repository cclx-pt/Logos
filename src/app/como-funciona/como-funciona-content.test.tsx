import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { tutorialSteps } from '@/lib/tutorial';
import { ComoFuncionaContent } from './como-funciona-content';

describe('ComoFuncionaContent', () => {
  it('mostra o heading e um passo por feature', () => {
    render(<ComoFuncionaContent />);
    expect(screen.getByRole('heading', { level: 1, name: /como funciona/i })).toBeInTheDocument();
    for (const step of tutorialSteps) {
      expect(screen.getByRole('heading', { level: 2, name: step.title })).toBeInTheDocument();
    }
  });

  it('mostra o placeholder "Vídeo em breve" enquanto não há vídeo', () => {
    render(<ComoFuncionaContent />);
    const semVideo = tutorialSteps.filter((s) => s.youtubeUrl === null).length;
    expect(screen.getAllByText(/vídeo em breve/i)).toHaveLength(semVideo);
  });

  it('tem CTA para o catálogo de conteúdos', () => {
    render(<ComoFuncionaContent />);
    expect(screen.getByRole('link', { name: /explorar os conteúdos/i })).toHaveAttribute(
      'href',
      '/conteudos',
    );
  });
});
