import { describe, it, expect } from 'vitest';

import { buildQuestionEmail } from './email';

const base = {
  authorName: 'João Silva',
  authorEmail: 'joao@exemplo.pt',
  courseTitle: 'Fundamentos da Fé',
  moduleTitle: 'A Graça',
  lessonTitle: 'Justificação pela fé',
  body: 'Não percebi a diferença entre justificação e santificação.',
};

describe('buildQuestionEmail', () => {
  it('põe curso e aula no assunto', () => {
    const { subject } = buildQuestionEmail(base);
    expect(subject).toContain('Fundamentos da Fé');
    expect(subject).toContain('Justificação pela fé');
  });

  it('identifica o autor com nome e email no corpo', () => {
    const { text } = buildQuestionEmail(base);
    expect(text).toContain('João Silva (joao@exemplo.pt)');
  });

  it('inclui curso, módulo, aula e o corpo da pergunta', () => {
    const { text } = buildQuestionEmail(base);
    expect(text).toContain('Curso: Fundamentos da Fé');
    expect(text).toContain('Módulo: A Graça');
    expect(text).toContain('Aula: Justificação pela fé');
    expect(text).toContain(base.body);
  });

  it('cai só para o nome quando não há email', () => {
    const { text } = buildQuestionEmail({ ...base, authorEmail: null });
    expect(text).toContain('De: João Silva');
    expect(text).not.toContain('(');
  });
});
