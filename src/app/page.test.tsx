import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HomeHero } from '@/components/site/home-hero';
import { HomeMotto } from '@/components/site/home-motto';

describe('HomeHero', () => {
  it('apresenta o heading principal com capitalizações pedidas', () => {
    render(<HomeHero isAuthenticated={false} ctaHref="/meus-cursos" />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveTextContent(/Estudo Bíblico para uma Fé Enraizada\./);
  });

  it('mostra o wordmark LOGOS no hero', () => {
    render(<HomeHero isAuthenticated={false} ctaHref="/meus-cursos" />);
    expect(screen.getByLabelText('LOGOS')).toBeInTheDocument();
  });

  it('apresenta o subtítulo com a proposta de valor gratuita', () => {
    render(<HomeHero isAuthenticated={false} ctaHref="/meus-cursos" />);
    expect(
      screen.getByText(/Cursos, Apostilas e o teu ritmo - Sempre gratuitos\./),
    ).toBeInTheDocument();
  });

  it('quando há sessão, expõe link "Meus cursos" para ctaHref', () => {
    render(<HomeHero isAuthenticated={true} ctaHref="/meus-cursos" />);
    const cta = screen.getByRole('link', { name: /meus cursos/i });
    expect(cta).toHaveAttribute('href', '/meus-cursos');
  });

  it('sem sessão, expõe botões de login (Google + Microsoft) com hidden input next', () => {
    const { container } = render(<HomeHero isAuthenticated={false} ctaHref="/meus-cursos" />);
    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar com microsoft/i })).toBeInTheDocument();
    const hidden = container.querySelector('input[name="next"]');
    expect(hidden).toHaveAttribute('value', '/meus-cursos');
  });

  it('não tem o botão "Conhece o projeto"', () => {
    render(<HomeHero isAuthenticated={false} ctaHref="/meus-cursos" />);
    expect(screen.queryByText(/conhece o projeto/i)).not.toBeInTheDocument();
  });
});

describe('HomeMotto', () => {
  it('é um aside com aria-label do lema', () => {
    render(<HomeMotto />);
    expect(screen.getByLabelText(/Lema do ministério LOGOS/i)).toBeInTheDocument();
  });

  it('inclui as três linhas do lema', () => {
    render(<HomeMotto />);
    expect(screen.getByText(/queremos formar pessoas/i)).toBeInTheDocument();
    expect(screen.getByText(/queremos despertar paixão/i)).toBeInTheDocument();
    expect(screen.getByText(/queremos viver a Bíblia/i)).toBeInTheDocument();
  });
});
