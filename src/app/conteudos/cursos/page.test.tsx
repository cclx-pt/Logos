import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { CursosContent } from './cursos-content';

describe('CursosContent', () => {
  it('apresenta heading e nota "Em breve"', () => {
    render(<CursosContent />);
    expect(screen.getByRole('heading', { level: 1, name: /^cursos$/i })).toBeInTheDocument();
    expect(screen.getByText(/^em breve$/i)).toBeInTheDocument();
  });

  it('lista os 3 pilares: vídeo, apostila, ritmo próprio', () => {
    render(<CursosContent />);
    expect(
      screen.getByRole('heading', { level: 3, name: /vídeo em qualquer dispositivo/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: /apostila para descarregar/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /o teu ritmo/i })).toBeInTheDocument();
  });
});
