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

/**
 * Etiqueta PT-PT por estado, na perspetiva do aluno (vista "as minhas
 * conversas", PR4). `new` lê-se como "à espera da equipa", não "nova".
 */
export const QUESTION_STATUS_LABEL_OWNER: Record<QuestionStatus, string> = {
  new: 'Em espera',
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

// =============================================================================
// Conversa (thread) — V3.6
// =============================================================================

/**
 * Papel do autor de uma mensagem da conversa. Espelha o CHECK
 * `author_role in ('student', 'admin')` de `lesson_question_messages`.
 * `student` = seguimento do aluno; `admin` = resposta da equipa.
 */
export const MESSAGE_AUTHOR_ROLES = ['student', 'admin'] as const;
export type MessageAuthorRole = (typeof MESSAGE_AUTHOR_ROLES)[number];

export function isMessageAuthorRole(value: unknown): value is MessageAuthorRole {
  return typeof value === 'string' && (MESSAGE_AUTHOR_ROLES as readonly string[]).includes(value);
}

/**
 * Limites do corpo de uma mensagem (resposta da equipa ou seguimento do aluno).
 * Espelham o CHECK `length(body) between 2 and 5000` de
 * `lesson_question_messages`. Mínimo baixo de propósito: uma resposta pode ser
 * curta ("Sim, exactamente."); o teto é generoso para respostas com explicação.
 */
export const MESSAGE_BODY_MIN = 2;
export const MESSAGE_BODY_MAX = 5000;

/**
 * Normaliza (trim) e valida o corpo de uma mensagem da conversa contra os mesmos
 * limites do CHECK da BD. Partilhada pelo composer de admin (PR3) e pelo
 * seguimento do aluno (PR4). Mensagens em PT-PT (mostradas ao utilizador).
 */
export function validateMessageBody(raw: unknown): QuestionBodyResult {
  if (typeof raw !== 'string') {
    return { ok: false, error: 'Escreve a tua mensagem.' };
  }
  const value = raw.trim();
  if (value.length < MESSAGE_BODY_MIN) {
    return {
      ok: false,
      error: `A mensagem é curta de mais (mínimo ${MESSAGE_BODY_MIN} caracteres).`,
    };
  }
  if (value.length > MESSAGE_BODY_MAX) {
    return {
      ok: false,
      error: `A mensagem é longa de mais (máximo ${MESSAGE_BODY_MAX} caracteres).`,
    };
  }
  return { ok: true, value };
}

/**
 * Formato do código de conversa gerado por `gen_thread_code()` na BD:
 * `LOGOS-` + 6 chars do alfabeto sem ambíguos (sem I, L, O, 0, 1). Usado para
 * validar o parâmetro de rota do link "ver conversa" (PR4) antes de ir à BD.
 */
export const THREAD_CODE_RE = /^LOGOS-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function isThreadCode(value: unknown): value is string {
  return typeof value === 'string' && THREAD_CODE_RE.test(value);
}
