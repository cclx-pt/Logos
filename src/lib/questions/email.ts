/**
 * Composição (pura) dos emails de uma conversa de pergunta à aula.
 *
 * Separada do envio (`@/lib/email/send`) para ser testável sem rede. Dois
 * destinatários:
 *   - a equipa (inbox interna): notificação de pergunta nova;
 *   - o aluno: cópia/confirmação da pergunta que fez (Feature 2, V3.6).
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
