import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { tutorialSteps } from '@/lib/tutorial';
import { ComoFuncionaContent } from './como-funciona-content';

const first = tutorialSteps[0];
const second = tutorialSteps[1];
const last = tutorialSteps[tutorialSteps.length - 1];

describe('ComoFuncionaContent (wizard)', () => {
  it('mostra só o primeiro passo no início', () => {
    render(<ComoFuncionaContent />);
    expect(screen.getByRole('heading', { level: 2, name: first.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: second.title })).not.toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`passo 1 de ${tutorialSteps.length}`, 'i')),
    ).toBeInTheDocument();
  });

  it('"Anterior" está desativado no primeiro passo', () => {
    render(<ComoFuncionaContent />);
    expect(screen.getByRole('button', { name: /anterior/i })).toBeDisabled();
  });

  it('"Seguinte" avança para o passo seguinte', () => {
    render(<ComoFuncionaContent />);
    fireEvent.click(screen.getByRole('button', { name: /seguinte/i }));
    expect(screen.getByRole('heading', { level: 2, name: second.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: first.title })).not.toBeInTheDocument();
  });

  it('no último passo mostra "Concluir" (para /conteudos) e não "Seguinte"', () => {
    render(<ComoFuncionaContent />);
    for (let i = 0; i < tutorialSteps.length - 1; i++) {
      fireEvent.click(screen.getByRole('button', { name: /seguinte/i }));
    }
    expect(screen.getByRole('heading', { level: 2, name: last.title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /seguinte/i })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /concluir/i })).toHaveAttribute('href', '/conteudos');
  });

  it('embebe o vídeo do passo em autoplay mudo, em loop e sem chrome do YouTube', () => {
    render(<ComoFuncionaContent />);
    const iframe = screen.getByTitle(`Vídeo: ${first.title}`);
    const src = iframe.getAttribute('src') ?? '';
    const id = first.youtubeUrl?.split('/').pop() ?? '';
    expect(src).toContain('youtube-nocookie.com/embed/');
    expect(src).toContain('autoplay=1');
    expect(src).toContain('mute=1');
    expect(src).toContain('loop=1');
    expect(src).toContain(`playlist=${id}`);
    expect(src).toContain('controls=0');
    expect(src).toContain('rel=0');
    expect(src).toContain('modestbranding=1');
  });

  it('aplica o letterbox-crop (iframe ampliado em altura) para esconder o título', () => {
    render(<ComoFuncionaContent />);
    const iframe = screen.getByTitle(`Vídeo: ${first.title}`);
    expect(iframe.className).toContain('h-[160%]');
    expect(iframe.className).toContain('absolute');
  });

  it('mostra o placeholder de vídeo enquanto o passo não tem vídeo', () => {
    render(<ComoFuncionaContent />);
    if (first.youtubeUrl === null) {
      expect(screen.getByText(/vídeo em breve/i)).toBeInTheDocument();
    }
  });
});
