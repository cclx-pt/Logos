import { describe, it, expect } from 'vitest';

import {
  buildQuestionEmail,
  buildQuestionReceiptEmail,
  threadHeaders,
  EMAIL_SIGNATURE,
} from './email';

const THREAD = 'LOGOS-7F3AKM';

const base = {
  authorName: 'João Silva',
  authorEmail: 'joao@exemplo.pt',
  courseTitle: 'Fundamentos da Fé',
  moduleTitle: 'A Graça',
  lessonTitle: 'Justificação pela fé',
  body: 'Não percebi a diferença entre justificação e santificação.',
  threadCode: THREAD,
  adminUrl: 'https://logos.cclx.pt/admin/perguntas',
};

describe('threadHeaders', () => {
  it('produz References/In-Reply-To com a mesma âncora determinística', () => {
    const h = threadHeaders(THREAD);
    expect(h['References']).toBe(`<thread-${THREAD}@logos.cclx.pt>`);
    expect(h['In-Reply-To']).toBe(h['References']);
  });
});

describe('buildQuestionEmail (equipa)', () => {
  it('põe curso, aula e o código da conversa no assunto', () => {
    const { subject } = buildQuestionEmail(base);
    expect(subject).toContain('Fundamentos da Fé');
    expect(subject).toContain('Justificação pela fé');
    expect(subject).toContain(`[${THREAD}]`);
  });

  it('identifica o autor com nome e email no corpo', () => {
    const { text } = buildQuestionEmail(base);
    expect(text).toContain('João Silva (joao@exemplo.pt)');
  });

  it('inclui contexto, código, corpo e o link da inbox', () => {
    const { text } = buildQuestionEmail(base);
    expect(text).toContain('Curso: Fundamentos da Fé');
    expect(text).toContain('Módulo: A Graça');
    expect(text).toContain('Aula: Justificação pela fé');
    expect(text).toContain(`Conversa: ${THREAD}`);
    expect(text).toContain(base.body);
    expect(text).toContain(base.adminUrl);
  });

  it('cai só para o nome quando não há email', () => {
    const { text } = buildQuestionEmail({ ...base, authorEmail: null });
    expect(text).toContain('De: João Silva');
  });

  it('traz os headers de thread', () => {
    const { headers } = buildQuestionEmail(base);
    expect(headers['References']).toBe(`<thread-${THREAD}@logos.cclx.pt>`);
  });
});

describe('buildQuestionReceiptEmail (aluno)', () => {
  const receiptInput = {
    authorName: 'João Silva',
    courseTitle: 'Fundamentos da Fé',
    moduleTitle: 'A Graça',
    lessonTitle: 'Justificação pela fé',
    body: 'Não percebi a diferença entre justificação e santificação.',
    threadCode: THREAD,
    conversationUrl: 'https://logos.cclx.pt/perguntas/LOGOS-7F3AKM',
  };

  it('saúda o aluno e devolve uma cópia da pergunta dele', () => {
    const { text } = buildQuestionReceiptEmail(receiptInput);
    expect(text).toContain('Olá João Silva');
    expect(text).toContain('A tua pergunta:');
    expect(text).toContain(receiptInput.body);
  });

  it('inclui o código, o link da conversa e a assinatura', () => {
    const { subject, text } = buildQuestionReceiptEmail(receiptInput);
    expect(subject).toContain(`[${THREAD}]`);
    expect(text).toContain(`Conversa: ${THREAD}`);
    expect(text).toContain(receiptInput.conversationUrl);
    expect(text).toContain(EMAIL_SIGNATURE);
  });

  it('não expõe o email do aluno no próprio email de cópia', () => {
    const { text } = buildQuestionReceiptEmail(receiptInput);
    expect(text).not.toContain('@exemplo.pt');
  });

  it('partilha a âncora de thread com a notificação da equipa', () => {
    const { headers } = buildQuestionReceiptEmail(receiptInput);
    expect(headers['References']).toBe(threadHeaders(THREAD)['References']);
  });
});
