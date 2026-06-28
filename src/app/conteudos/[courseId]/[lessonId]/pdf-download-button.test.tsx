import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSignedUrl, mockOpen } = vi.hoisted(() => ({
  mockGetSignedUrl: vi.fn(),
  mockOpen: vi.fn(),
}));

vi.mock('@/lib/courses/access-actions', () => ({
  getLessonPdfSignedUrlAction: mockGetSignedUrl,
}));

import { PdfDownloadButton } from './pdf-download-button';

const LESSON_ID = '22222222-2222-4222-8222-222222222222';

describe('PdfDownloadButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', mockOpen);
  });

  it('renderiza estado idle com label "Descarregar apostila"', () => {
    render(<PdfDownloadButton lessonId={LESSON_ID} lessonTitle="Aula 1" />);
    const btn = screen.getByRole('button', { name: /descarregar apostila de aula 1/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('chama getLessonPdfSignedUrlAction e abre a URL devolvida em nova aba', async () => {
    mockGetSignedUrl.mockResolvedValue({ ok: true, url: 'https://signed.example/pdf' });
    const user = userEvent.setup();
    render(<PdfDownloadButton lessonId={LESSON_ID} lessonTitle="Aula 1" />);
    const btn = screen.getByRole('button', { name: /descarregar apostila de aula 1/i });
    await act(async () => {
      await user.click(btn);
    });
    expect(mockGetSignedUrl).toHaveBeenCalledWith(LESSON_ID);
    expect(mockOpen).toHaveBeenCalledWith(
      'https://signed.example/pdf',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('mostra mensagem de erro inline quando a action falha', async () => {
    mockGetSignedUrl.mockResolvedValue({ ok: false, error: 'Aula não encontrada ou sem acesso.' });
    const user = userEvent.setup();
    render(<PdfDownloadButton lessonId={LESSON_ID} lessonTitle="Aula 1" />);
    const btn = screen.getByRole('button', { name: /descarregar apostila de aula 1/i });
    await act(async () => {
      await user.click(btn);
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/sem acesso/i);
    expect(mockOpen).not.toHaveBeenCalled();
  });

  it('desabilita botão e troca para spinner enquanto pending', async () => {
    mockGetSignedUrl.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<PdfDownloadButton lessonId={LESSON_ID} lessonTitle="Aula 1" />);
    const btn = screen.getByRole('button', { name: /descarregar apostila de aula 1/i });
    await act(async () => {
      await user.click(btn);
    });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getAllByText(/a preparar pdf/i).length).toBeGreaterThan(0);
  });
});
