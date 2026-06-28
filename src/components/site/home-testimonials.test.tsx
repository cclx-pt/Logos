import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeTestimonials } from './home-testimonials';

describe('HomeTestimonials', () => {
  it('é uma section identificada como testemunhos do LOGOS', () => {
    render(<HomeTestimonials />);
    expect(screen.getByLabelText(/testemunhos de quem usa o LOGOS/i)).toBeInTheDocument();
  });

  it('renderiza os quatro testemunhos reais do ministério', () => {
    render(<HomeTestimonials />);
    const slides = screen.getAllByRole('listitem', { hidden: false });
    // 4 slides + os 4 pontos da paginação (tablist) só aparecem após o embla
    // inicializar; contamos os slides pelo aria-label "Testemunho N de 4".
    const testimonialSlides = slides.filter((s) =>
      /Testemunho \d+ de 4/i.test(s.getAttribute('aria-label') ?? ''),
    );
    expect(testimonialSlides).toHaveLength(4);
  });

  it('assina cada testemunho com o nome do autor (ordem do líder, 10-06-2026)', () => {
    render(<HomeTestimonials />);
    expect(screen.getByText('Bernardo Degues')).toBeInTheDocument();
    expect(screen.getByText('Sara Narciso')).toBeInTheDocument();
    // Nome completo confirmado pelo líder (era só "Raniere").
    expect(screen.getByText('Raniere Bruno')).toBeInTheDocument();
    expect(screen.getByText('André Mata')).toBeInTheDocument();
    // Os quotes continuam presentes.
    expect(screen.getByText(/sair da zona de conforto/i)).toBeInTheDocument();
  });

  it('expõe controlos de navegação anterior/seguinte', () => {
    render(<HomeTestimonials />);
    expect(screen.getByRole('button', { name: /testemunho anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /testemunho seguinte/i })).toBeInTheDocument();
  });
});
