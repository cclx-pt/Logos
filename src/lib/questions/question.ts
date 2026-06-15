/**
 * Domínio partilhado das perguntas às aulas ("Pergunta aos professores").
 *
 * Constantes e validação reutilizadas pela Server Action de submissão (aluno,
 * PR2) e pela inbox de admin (PR3). Espelha o schema de `lesson_questions`
 * (migration 20260612220000): os valores de `status` e os limites de `body`
 * têm de coincidir com os CHECK da base de dados (defesa em profundidade — a
 * validação TS apanha cedo, o CHECK é a última linha).
 */

// Dois estados (V3.6 PR5): a conversa está "Por responder" (new) ou "Respondida"
// (answered). 'archived' foi removido — uma conversa respondida fica sempre
// acessível e qualquer resposta do aluno reabre-a (volta a new). Espelha o CHECK
// `status in ('new','answered')` da migration 20260614120000.
export const QUESTION_STATUSES = ['new', 'answered'] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

/** Etiqueta PT-PT por estado. Usada na inbox de admin. */
export const QUESTION_STATUS_LABEL: Record<QuestionStatus, string> = {
  new: 'Por responder',
  answered: 'Respondida',
};

/**
 * Etiqueta PT-PT por estado, na perspetiva do aluno (vista "as minhas
 * conversas"). Mesma terminologia da inbox de admin: a equipa ainda tem de
 * responder ("Por responder") ou já respondeu ("Respondida").
 */
export const QUESTION_STATUS_LABEL_OWNER: Record<QuestionStatus, string> = {
  new: 'Por responder',
  answered: 'Respondida',
};

export function isQuestionStatus(value: unknown): value is QuestionStatus {
  return typeof value === 'string' && (QUESTION_STATUSES as readonly string[]).includes(value);
}

/**
 * Regra única do "não lido" do aluno (V3.6 PR5). Uma conversa está por ler
 * quando a equipa respondeu (`answered`) e há actividade posterior à última
 * abertura do aluno: ou nunca a abriu (`ownerSeenAt` null) ou houve resposta
 * nova (`updatedAt` > `ownerSeenAt`). A RPC `mark_thread_seen` põe
 * `owner_seen_at = now()` no mesmo statement em que o trigger põe
 * `updated_at = now()`, por isso logo após abrir os dois são iguais e isto dá
 * `false` até a equipa responder de novo. Partilhada pelo cabeçalho (ponto) e
 * pela lista do aluno (highlight).
 */
export function isConversationUnread(input: {
  status: QuestionStatus;
  updatedAt: string;
  ownerSeenAt: string | null;
}): boolean {
  if (input.status !== 'answered') return false;
  if (input.ownerSeenAt === null) return true;
  return new Date(input.updatedAt).getTime() > new Date(input.ownerSeenAt).getTime();
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
