import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// A Server Action é mockada (não corre código de servidor no teste). A sua
// lógica está coberta em src/lib/questions/actions.test.ts.
vi.mock('@/lib/questions/actions', () => ({ submitQuestionAction: vi.fn() }));

import { AskQuestionCard } from './ask-question-card';

const props = {
  lessonId: '11111111-1111-1111-1111-111111111111',
  courseTitle: 'Fundamentos da Fé',
  moduleTitle: 'A Graça',
  lessonTitle: 'Justificação pela fé',
  authorName: 'João Silva',
};

// Nota: tal como UserMenu, o conteúdo do Dialog (Base UI) só monta ao abrir e o
// portal é flaky em jsdom. Testamos o trigger/caixa de forma determinística; o
// fluxo de submissão é validado pelos testes da action + E2E manual.
describe('AskQuestionCard — caixa/trigger', () => {
  it('mostra o convite e o botão para perguntar', () => {
    render(<AskQuestionCard {...props} />);
    expect(screen.getByText('Tens uma dúvida?')).toBeInTheDocument();
    expect(screen.getByText(/resposta chega-te por email/i)).toBeInTheDocument();
  });

  it('o trigger é um botão acessível', () => {
    render(<AskQuestionCard {...props} />);
    expect(screen.getByRole('button', { name: /fazer uma pergunta/i })).toBeInTheDocument();
  });
});
