/**
 * Composição (pura) dos emails de uma conversa de pergunta à aula.
 *
 * Separada do envio (`@/lib/email/send`) para ser testável sem rede. Cada
 * mensagem de uma conversa gera email para os DOIS lados (decisão do líder,
 * 14-06-2026) - o email é o arquivo de tudo:
 *   - a equipa (inbox interna): pergunta nova, seguimento do aluno, e cópia das
 *     respostas que a equipa envia;
 *   - o aluno: cópia/confirmação da pergunta, recibo dos seus seguimentos, e a
 *     resposta da equipa.
 *
 * Todos os emails de uma conversa partilham um código (`LOGOS-XXXXXX`) no
 * assunto e uma âncora em `References`/`In-Reply-To`, para os clientes de email
 * agruparem e para "saber que estão a falar do mesmo".
 */

/** Assinatura dos emails virados ao aluno (decisão do líder, 13-06-2026). */
export const EMAIL_SIGNATURE = 'Ministério LOGOS - CCLX';

const SEPARATOR = '------------------------------';

/**
 * Âncora de thread estável e determinística por conversa. Vai em
 * `References`/`In-Reply-To` de todos os emails do thread. O domínio coincide
 * com o de envio (`logos.cclx.pt`, verificado no Resend).
 */
function threadReference(threadCode: string): string {
  return `<thread-${threadCode}@logos.cclx.pt>`;
}

export function threadHeaders(threadCode: string): Record<string, string> {
  const ref = threadReference(threadCode);
  return { References: ref, 'In-Reply-To': ref };
}

export type QuestionEmail = { subject: string; text: string; headers: Record<string, string> };

// =============================================================================
// Notificação à equipa (inbox interna)
// =============================================================================

export type QuestionEmailInput = {
  authorName: string;
  /** Email do aluno; pode faltar em casos-limite (vira só o nome). */
  authorEmail: string | null;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  body: string;
  threadCode: string;
  /** Link para a inbox de admin (lista de perguntas). */
  adminUrl: string;
};

export function buildQuestionEmail(input: QuestionEmailInput): QuestionEmail {
  const subject = `Pergunta · ${input.courseTitle} · ${input.lessonTitle} [${input.threadCode}]`;

  const who = input.authorEmail ? `${input.authorName} (${input.authorEmail})` : input.authorName;

  const text = [
    `De: ${who}`,
    `Curso: ${input.courseTitle}`,
    `Módulo: ${input.moduleTitle}`,
    `Aula: ${input.lessonTitle}`,
    `Conversa: ${input.threadCode}`,
    SEPARATOR,
    input.body,
    '',
    `Responde dentro da Logos: ${input.adminUrl}`,
  ].join('\n');

  return { subject, text, headers: threadHeaders(input.threadCode) };
}

// =============================================================================
// Seguimento do aluno → notificação à equipa (V3.6 PR4)
// =============================================================================

export type FollowupEmailInput = {
  authorName: string;
  /** Email do aluno; pode faltar em casos-limite (vira só o nome). */
  authorEmail: string | null;
  courseTitle: string;
  lessonTitle: string;
  /** Texto do seguimento escrito pelo aluno. */
  body: string;
  threadCode: string;
  /** Link para a conversa na inbox de admin. */
  adminUrl: string;
};

/**
 * Notifica a equipa de que o aluno deu seguimento à conversa. Partilha o código
 * e os headers de thread com a pergunta original (o cliente da equipa agrupa-os);
 * o `Re:` sobre a mesma base de assunto reforça-o. O corpo traz o seguimento e o
 * link para responder dentro da app.
 */
export function buildFollowupEmail(input: FollowupEmailInput): QuestionEmail {
  const subject = `Re: Pergunta · ${input.courseTitle} · ${input.lessonTitle} [${input.threadCode}]`;

  const who = input.authorEmail ? `${input.authorName} (${input.authorEmail})` : input.authorName;

  const text = [
    `${input.authorName} deu seguimento à conversa.`,
    '',
    `De: ${who}`,
    `Curso: ${input.courseTitle}`,
    `Aula: ${input.lessonTitle}`,
    `Conversa: ${input.threadCode}`,
    SEPARATOR,
    input.body,
    '',
    `Responde dentro da Logos: ${input.adminUrl}`,
  ].join('\n');

  return { subject, text, headers: threadHeaders(input.threadCode) };
}

// =============================================================================
// Resposta da equipa ao aluno (Feature 1, V3.6 PR3)
// =============================================================================

export type AnswerEmailInput = {
  authorName: string;
  courseTitle: string;
  lessonTitle: string;
  /** Pergunta de abertura do thread (citada para dar contexto). */
  questionBody: string;
  /** Resposta escrita pela equipa no composer de admin. */
  answerBody: string;
  threadCode: string;
  /** Link para a conversa do aluno na app. */
  conversationUrl: string;
};

/**
 * Email com a resposta da equipa. O `Re:` + a mesma base de assunto do recibo
 * fazem o cliente do aluno agrupar este email com a cópia da pergunta. A
 * assinatura é genérica (não expõe quem respondeu). Reply-To é definido por
 * quem envia (`= LOGOS_QUESTIONS_TO_EMAIL`, rede de segurança).
 */
export function buildAnswerEmail(input: AnswerEmailInput): QuestionEmail {
  const subject = `Re: A tua pergunta · ${input.courseTitle} [${input.threadCode}]`;

  const text = [
    `Olá ${input.authorName},`,
    '',
    'A equipa respondeu à tua pergunta:',
    '',
    input.answerBody,
    SEPARATOR,
    'A tua pergunta:',
    input.questionBody,
    SEPARATOR,
    '',
    `Podes ler e dar seguimento à conversa aqui: ${input.conversationUrl}`,
    '',
    EMAIL_SIGNATURE,
  ].join('\n');

  return { subject, text, headers: threadHeaders(input.threadCode) };
}

// =============================================================================
// Cópia da resposta da equipa → inbox interna (V3.6 PR5)
// =============================================================================

export type AnswerTeamCopyEmailInput = {
  /** Nome do aluno a quem se respondeu. */
  authorName: string;
  /** Nome do membro da equipa que respondeu (interno; nunca vai ao aluno). */
  repliedByName: string;
  courseTitle: string;
  lessonTitle: string;
  /** Resposta escrita pela equipa. */
  answerBody: string;
  threadCode: string;
  /** Link para a conversa na inbox de admin. */
  adminUrl: string;
};

/**
 * Cópia interna da resposta da equipa, para a inbox ficar com o arquivo completo
 * da conversa. Partilha o código e os headers de thread com a pergunta original
 * (a equipa agrupa-os); o `Re:` sobre a base de assunto da equipa reforça-o.
 */
export function buildAnswerTeamCopyEmail(input: AnswerTeamCopyEmailInput): QuestionEmail {
  const subject = `Re: Pergunta · ${input.courseTitle} · ${input.lessonTitle} [${input.threadCode}]`;

  const text = [
    `${input.repliedByName} respondeu a ${input.authorName}.`,
    '',
    `Curso: ${input.courseTitle}`,
    `Aula: ${input.lessonTitle}`,
    `Conversa: ${input.threadCode}`,
    SEPARATOR,
    input.answerBody,
    '',
    `Ver a conversa: ${input.adminUrl}`,
  ].join('\n');

  return { subject, text, headers: threadHeaders(input.threadCode) };
}

// =============================================================================
// Cópia/confirmação ao aluno (Feature 2)
// =============================================================================

export type QuestionReceiptEmailInput = {
  authorName: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  body: string;
  threadCode: string;
  /** Link para a conversa do aluno na app. */
  conversationUrl: string;
};

export function buildQuestionReceiptEmail(input: QuestionReceiptEmailInput): QuestionEmail {
  const subject = `A tua pergunta · ${input.courseTitle} [${input.threadCode}]`;

  const text = [
    `Olá ${input.authorName},`,
    '',
    'Recebemos a tua pergunta. A equipa responde-te por email assim que puder.',
    '',
    `Curso: ${input.courseTitle}`,
    `Módulo: ${input.moduleTitle}`,
    `Aula: ${input.lessonTitle}`,
    `Conversa: ${input.threadCode}`,
    SEPARATOR,
    'A tua pergunta:',
    input.body,
    SEPARATOR,
    '',
    `Podes acompanhar e dar seguimento à conversa aqui: ${input.conversationUrl}`,
    '',
    EMAIL_SIGNATURE,
  ].join('\n');

  return { subject, text, headers: threadHeaders(input.threadCode) };
}

// =============================================================================
// Recibo do seguimento ao aluno (V3.6 PR5)
// =============================================================================

export type FollowupReceiptEmailInput = {
  authorName: string;
  courseTitle: string;
  lessonTitle: string;
  /** Texto do seguimento que o aluno escreveu. */
  body: string;
  threadCode: string;
  /** Link para a conversa do aluno na app. */
  conversationUrl: string;
};

/**
 * Recibo ao aluno do seguimento que ele próprio enviou (o email é o arquivo de
 * tudo). O `Re:` + a mesma base de assunto da pergunta fazem o cliente do aluno
 * agrupar este email com o recibo da pergunta e a resposta da equipa.
 */
export function buildFollowupReceiptEmail(input: FollowupReceiptEmailInput): QuestionEmail {
  const subject = `Re: A tua pergunta · ${input.courseTitle} [${input.threadCode}]`;

  const text = [
    `Olá ${input.authorName},`,
    '',
    'Recebemos o teu seguimento. A equipa responde-te por email assim que puder.',
    '',
    `Curso: ${input.courseTitle}`,
    `Aula: ${input.lessonTitle}`,
    `Conversa: ${input.threadCode}`,
    SEPARATOR,
    'A tua mensagem:',
    input.body,
    SEPARATOR,
    '',
    `Podes acompanhar a conversa aqui: ${input.conversationUrl}`,
    '',
    EMAIL_SIGNATURE,
  ].join('\n');

  return { subject, text, headers: threadHeaders(input.threadCode) };
}
