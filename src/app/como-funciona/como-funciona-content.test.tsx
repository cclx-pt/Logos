import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { tutorialSteps } from '@/lib/tutorial';
import { ComoFuncionaContent } from './como-funciona-content';

// O player real usa a IFrame Player API do YouTube (sem iframe em jsdom). Aqui
// substituímo-lo por um stub que expõe o id do vídeo, para verificar que o
// wizard passa o vídeo certo a cada passo.
vi.mock('./tutorial-video', () => ({
  TutorialVideo: ({ youtubeId }: { youtubeId: string }) => (
    <div data-testid="tutorial-video" data-id={youtubeId} />
  ),
}));

const first = tutorialSteps[0];
const second = tutorialSteps[1];
const last = tutorialSteps[tutorialSteps.length - 1];

const videoId = (url: string | null) => url?.split('/').pop() ?? '';

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

  it('passa o vídeo do passo ao player e troca-o ao avançar', () => {
    render(<ComoFuncionaContent />);
    expect(screen.getByTestId('tutorial-video')).toHaveAttribute(
      'data-id',
      videoId(first.youtubeUrl),
    );
    fireEvent.click(screen.getByRole('button', { name: /seguinte/i }));
    expect(screen.getByTestId('tutorial-video')).toHaveAttribute(
      'data-id',
      videoId(second.youtubeUrl),
    );
  });
});
