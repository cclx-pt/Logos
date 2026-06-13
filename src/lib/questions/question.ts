/**
 * Domínio partilhado das perguntas às aulas ("Pergunta aos professores").
 *
 * Constantes e validação reutilizadas pela Server Action de submissão (aluno,
 * PR2) e pela inbox de admin (PR3). Espelha o schema de `lesson_questions`
 * (migration 20260612220000): os valores de `status` e os limites de `body`
 * têm de coincidir com os CHECK da base de dados (defesa em profundidade — a
 * validação TS apanha cedo, o CHECK é a última linha).
 */

export const QUESTION_STATUSES = ['new', 'answered', 'archived'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** Etiqueta PT-PT por estado. Usada na inbox de admin (PR3). */
export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  new: 'Nova',
  answered: 'Respondida',
  archived: 'Arquivada',
};

export function isQuestionStatus(value: unknown): value is QuestionStatus {
  return typeof value === 'string' && (QUESTION_STATUSES as readonly string[]).includes(value);
}

/** Limites do corpo — espelham o CHECK `length(body) between 10 and 2000`. */
export const QUESTION_BODY_MIN = 10;
export const QUESTION_BODY_MAX = 2000;

export type QuestionBodyResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Normaliza (trim) e valida o corpo de uma pergunta contra os mesmos limites
 * do CHECK da BD. Mensagens em PT-PT (são mostradas ao utilizador).
 */
export function validateQuestionBody(raw: unknown): QuestionBodyResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Escreve a tua pergunta.' };
  }
  const value = raw.trim();
  if (value.length < QUESTION_BODY_MIN) {
    return {
      ok: false,
      error: `A pergunta é curta de mais (mínimo ${QUESTION_BODY_MIN} caracteres).`,
    };
  }
  if (value.length > QUESTION_BODY_MAX) {
    return {
      ok: false,
      error: `A pergunta é longa de mais (máximo ${QUESTION_BODY_MAX} caracteres).`,
    };
  }
  return { ok: true, value };
}
