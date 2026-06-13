/**
 * Composição (pura) do email de notificação de uma pergunta à aula.
 *
 * Separada do envio (`@/lib/email/send`) para ser testável sem rede. O
 * assunto e o corpo identificam o aluno e o contexto (curso/módulo/aula); o
 * Reply-To (definido por quem envia) é o email do aluno, para a equipa
 * responder diretamente.
 */

export type QuestionEmailInput = {
  authorName: string;
  /** Email do aluno; pode faltar em casos-limite (vira só o nome). */
  authorEmail: string | null;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  body: string;
};

export type QuestionEmail = { subject: string; text: string };

export function buildQuestionEmail(input: QuestionEmailInput): QuestionEmail {
  const subject = `Pergunta · ${input.courseTitle} · ${input.lessonTitle}`;

  const who = input.authorEmail ? `${input.authorName} (${input.authorEmail})` : input.authorName;

  const text = [
    `De: ${who}`,
    `Curso: ${input.courseTitle}`,
    `Módulo: ${input.moduleTitle}`,
    `Aula: ${input.lessonTitle}`,
    '------------------------------',
    input.body,
    '',
    'Responde a este email para falar diretamente com o aluno.',
  ].join('\n');

  return { subject, text };
}
