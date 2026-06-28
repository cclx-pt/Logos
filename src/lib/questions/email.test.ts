import { describe, it, expect } from 'vitest';

import {
  buildQuestionEmail,
  buildQuestionReceiptEmail,
  buildAnswerEmail,
  buildAnswerTeamCopyEmail,
  buildFollowupEmail,
  buildFollowupReceiptEmail,
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

  it('encaminha a equipa para responder dentro da Logos', () => {
    const { text } = buildQuestionEmail(base);
    expect(text).toContain(`Responde dentro da Logos: ${base.adminUrl}`);
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

describe('buildAnswerEmail (resposta da equipa ao aluno)', () => {
  const answerInput = {
    authorName: 'João Silva',
    courseTitle: 'Fundamentos da Fé',
    lessonTitle: 'Justificação pela fé',
    questionBody: 'Não percebi a diferença entre justificação e santificação.',
    answerBody: 'Justificação é o acto; santificação é o processo que se segue.',
    threadCode: THREAD,
    conversationUrl: 'https://logos.cclx.pt/perguntas/LOGOS-7F3AKM',
  };

  it('usa "Re:" e o código no assunto para agrupar com a cópia da pergunta', () => {
    const { subject } = buildAnswerEmail(answerInput);
    expect(subject).toContain('Re: A tua pergunta');
    expect(subject).toContain('Fundamentos da Fé');
    expect(subject).toContain(`[${THREAD}]`);
  });

  it('saúda o aluno, traz a resposta e cita a pergunta original', () => {
    const { text } = buildAnswerEmail(answerInput);
    expect(text).toContain('Olá João Silva');
    expect(text).toContain(answerInput.answerBody);
    expect(text).toContain('A tua pergunta:');
    expect(text).toContain(answerInput.questionBody);
  });

  it('inclui o link da conversa e a assinatura genérica', () => {
    const { text } = buildAnswerEmail(answerInput);
    expect(text).toContain(answerInput.conversationUrl);
    expect(text).toContain(EMAIL_SIGNATURE);
  });

  it('não revela quem respondeu (sem nome de admin no corpo)', () => {
    const { text } = buildAnswerEmail(answerInput);
    expect(text).not.toMatch(/respondido por/i);
  });

  it('partilha a âncora de thread com os outros emails da conversa', () => {
    const { headers } = buildAnswerEmail(answerInput);
    expect(headers['References']).toBe(threadHeaders(THREAD)['References']);
  });
});

describe('buildFollowupEmail (seguimento do aluno → equipa)', () => {
  const followupInput = {
    authorName: 'João Silva',
    authorEmail: 'joao@exemplo.pt',
    courseTitle: 'Fundamentos da Fé',
    lessonTitle: 'Justificação pela fé',
    body: 'Obrigado - mas e quanto à perseverança dos santos?',
    threadCode: THREAD,
    adminUrl: 'https://logos.cclx.pt/admin/perguntas/abc',
  };

  it('usa "Re: Pergunta" + curso/aula + código no assunto para agrupar na inbox', () => {
    const { subject } = buildFollowupEmail(followupInput);
    expect(subject).toContain('Re: Pergunta');
    expect(subject).toContain('Fundamentos da Fé');
    expect(subject).toContain('Justificação pela fé');
    expect(subject).toContain(`[${THREAD}]`);
  });

  it('sinaliza que é um seguimento e identifica o autor com nome e email', () => {
    const { text } = buildFollowupEmail(followupInput);
    expect(text).toContain('deu seguimento à conversa');
    expect(text).toContain('De: João Silva (joao@exemplo.pt)');
    expect(text).toContain(followupInput.body);
  });

  it('encaminha a equipa para responder dentro da Logos', () => {
    const { text } = buildFollowupEmail(followupInput);
    expect(text).toContain(`Responde dentro da Logos: ${followupInput.adminUrl}`);
  });

  it('cai só para o nome quando não há email', () => {
    const { text } = buildFollowupEmail({ ...followupInput, authorEmail: null });
    expect(text).toContain('De: João Silva');
  });

  it('partilha a âncora de thread com os outros emails da conversa', () => {
    const { headers } = buildFollowupEmail(followupInput);
    expect(headers['References']).toBe(threadHeaders(THREAD)['References']);
  });
});

describe('buildAnswerTeamCopyEmail (cópia da resposta da equipa → inbox)', () => {
  const copyInput = {
    authorName: 'João Silva',
    repliedByName: 'Pastor André',
    courseTitle: 'Fundamentos da Fé',
    lessonTitle: 'Justificação pela fé',
    answerBody: 'Justificação é o acto; santificação é o processo que se segue.',
    threadCode: THREAD,
    adminUrl: 'https://logos.cclx.pt/admin/perguntas/abc',
  };

  it('usa "Re: Pergunta" + curso/aula + código no assunto para agrupar na inbox', () => {
    const { subject } = buildAnswerTeamCopyEmail(copyInput);
    expect(subject).toContain('Re: Pergunta');
    expect(subject).toContain('Fundamentos da Fé');
    expect(subject).toContain('Justificação pela fé');
    expect(subject).toContain(`[${THREAD}]`);
  });

  it('regista quem respondeu a quem, o contexto e a resposta', () => {
    const { text } = buildAnswerTeamCopyEmail(copyInput);
    expect(text).toContain('Pastor André respondeu a João Silva.');
    expect(text).toContain('Curso: Fundamentos da Fé');
    expect(text).toContain('Aula: Justificação pela fé');
    expect(text).toContain(`Conversa: ${THREAD}`);
    expect(text).toContain(copyInput.answerBody);
    expect(text).toContain(`Ver a conversa: ${copyInput.adminUrl}`);
  });

  it('partilha a âncora de thread com os outros emails da conversa', () => {
    const { headers } = buildAnswerTeamCopyEmail(copyInput);
    expect(headers['References']).toBe(threadHeaders(THREAD)['References']);
  });
});

describe('buildFollowupReceiptEmail (recibo do seguimento ao aluno)', () => {
  const receiptInput = {
    authorName: 'João Silva',
    courseTitle: 'Fundamentos da Fé',
    lessonTitle: 'Justificação pela fé',
    body: 'Obrigado - mas e quanto à perseverança dos santos?',
    threadCode: THREAD,
    conversationUrl: 'https://logos.cclx.pt/perguntas/LOGOS-7F3AKM',
  };

  it('usa "Re: A tua pergunta" + código no assunto para agrupar no cliente do aluno', () => {
    const { subject } = buildFollowupReceiptEmail(receiptInput);
    expect(subject).toContain('Re: A tua pergunta');
    expect(subject).toContain('Fundamentos da Fé');
    expect(subject).toContain(`[${THREAD}]`);
  });

  it('saúda o aluno, confirma o seguimento e devolve uma cópia da mensagem', () => {
    const { text } = buildFollowupReceiptEmail(receiptInput);
    expect(text).toContain('Olá João Silva');
    expect(text).toContain('Recebemos o teu seguimento');
    expect(text).toContain('A tua mensagem:');
    expect(text).toContain(receiptInput.body);
  });

  it('inclui o link da conversa e a assinatura', () => {
    const { text } = buildFollowupReceiptEmail(receiptInput);
    expect(text).toContain(receiptInput.conversationUrl);
    expect(text).toContain(EMAIL_SIGNATURE);
  });

  it('partilha a âncora de thread com os outros emails da conversa', () => {
    const { headers } = buildFollowupReceiptEmail(receiptInput);
    expect(headers['References']).toBe(threadHeaders(THREAD)['References']);
  });
});
