import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { PdfDownloadButton } from './pdf-download-button';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '22222222-2222-4222-8222-222222222222';

describe('PdfDownloadButton', () => {
  it('renderiza um link "Descarregar sebenta" com nome acessível', () => {
    render(<PdfDownloadButton courseId={COURSE_ID} lessonId={LESSON_ID} lessonTitle="Aula 1" />);
    const link = screen.getByRole('link', { name: /descarregar sebenta de aula 1/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent(/descarregar sebenta/i);
  });

  it('aponta para o route handler /sebenta com ?dl=1 (download em vez de inline)', () => {
    render(<PdfDownloadButton courseId={COURSE_ID} lessonId={LESSON_ID} lessonTitle="Aula 1" />);
    const link = screen.getByRole('link', { name: /descarregar sebenta de aula 1/i });
    // Navegação real por <a> (e não window.open após await) para os bloqueadores
    // de popups em mobile não bloquearem o download.
    expect(link).toHaveAttribute('href', `/conteudos/${COURSE_ID}/${LESSON_ID}/sebenta?dl=1`);
  });
});
