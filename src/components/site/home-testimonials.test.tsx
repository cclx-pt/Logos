import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeTestimonials } from './home-testimonials';

describe('HomeTestimonials', () => {
  it('é uma section identificada como testemunhos do LOGOS', () => {
    render(<HomeTestimonials />);
    expect(screen.getByLabelText(/testemunhos de quem usa o LOGOS/i)).toBeInTheDocument();
  });

  it('renderiza pelo menos 4 slides', () => {
    render(<HomeTestimonials />);
    const slides = screen.getAllByRole('listitem', { hidden: false });
    expect(slides.length).toBeGreaterThanOrEqual(4);
  });

  it('expõe controlos de navegação anterior/seguinte', () => {
    render(<HomeTestimonials />);
    expect(screen.getByRole('button', { name: /testemunho anterior/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /testemunho seguinte/i })).toBeInTheDocument();
  });
});
