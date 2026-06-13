import { describe, it, expect } from 'vitest';

import {
  QUESTION_STATUSES,
  QUESTION_STATUS_LABEL,
  QUESTION_BODY_MIN,
  QUESTION_BODY_MAX,
  isQuestionStatus,
  validateQuestionBody,
  MESSAGE_AUTHOR_ROLES,
  MESSAGE_BODY_MIN,
  MESSAGE_BODY_MAX,
  isMessageAuthorRole,
  validateMessageBody,
  isThreadCode,
} from './question';

describe('isQuestionStatus', () => {
  it('aceita os três estados válidos', () => {
    for (const s of QUESTION_STATUSES) {
      expect(isQuestionStatus(s)).toBe(true);
    }
  });

  it('rejeita valores fora do conjunto e não-strings', () => {
    expect(isQuestionStatus('done')).toBe(false);
    expect(isQuestionStatus('')).toBe(false);
    expect(isQuestionStatus(null)).toBe(false);
    expect(isQuestionStatus(undefined)).toBe(false);
    expect(isQuestionStatus(1)).toBe(false);
  });
});

describe('QUESTION_STATUS_LABEL', () => {
  it('tem etiqueta PT-PT para cada estado', () => {
    for (const s of QUESTION_STATUSES) {
      expect(QUESTION_STATUS_LABEL[s]).toBeTruthy();
    }
    expect(QUESTION_STATUS_LABEL.new).toBe('Nova');
    expect(QUESTION_STATUS_LABEL.answered).toBe('Respondida');
    expect(QUESTION_STATUS_LABEL.archived).toBe('Arquivada');
  });
});

describe('validateQuestionBody', () => {
  it('rejeita não-strings', () => {
    expect(validateQuestionBody(null)).toEqual({ ok: false, error: 'Escreve a tua pergunta.' });
    expect(validateQuestionBody(123)).toEqual({ ok: false, error: 'Escreve a tua pergunta.' });
  });

  it('rejeita corpo curto de mais (após trim)', () => {
    const result = validateQuestionBody('   curto   ');
    expect(result.ok).toBe(false);
  });

  it('rejeita corpo longo de mais', () => {
    const result = validateQuestionBody('a'.repeat(QUESTION_BODY_MAX + 1));
    expect(result.ok).toBe(false);
  });

  it('aceita e normaliza (trim) um corpo válido', () => {
    const result = validateQuestionBody('  Tenho uma dúvida sobre a justificação pela fé.  ');
    expect(result).toEqual({
      ok: true,
      value: 'Tenho uma dúvida sobre a justificação pela fé.',
    });
  });

  it('aceita exactamente no limite mínimo', () => {
    const exact = 'x'.repeat(QUESTION_BODY_MIN);
    expect(validateQuestionBody(exact)).toEqual({ ok: true, value: exact });
  });
});

describe('isMessageAuthorRole', () => {
  it('aceita os papéis válidos', () => {
    for (const r of MESSAGE_AUTHOR_ROLES) {
      expect(isMessageAuthorRole(r)).toBe(true);
    }
  });

  it('rejeita valores fora do conjunto e não-strings', () => {
    expect(isMessageAuthorRole('teacher')).toBe(false);
    expect(isMessageAuthorRole('super_admin')).toBe(false);
    expect(isMessageAuthorRole('')).toBe(false);
    expect(isMessageAuthorRole(null)).toBe(false);
    expect(isMessageAuthorRole(2)).toBe(false);
  });
});

describe('validateMessageBody', () => {
  it('rejeita não-strings', () => {
    expect(validateMessageBody(null)).toEqual({ ok: false, error: 'Escreve a tua mensagem.' });
    expect(validateMessageBody(undefined)).toEqual({ ok: false, error: 'Escreve a tua mensagem.' });
  });

  it('rejeita corpo curto de mais (após trim)', () => {
    expect(validateMessageBody('  a  ').ok).toBe(false);
    expect(validateMessageBody('   ').ok).toBe(false);
  });

  it('rejeita corpo longo de mais', () => {
    expect(validateMessageBody('a'.repeat(MESSAGE_BODY_MAX + 1)).ok).toBe(false);
  });

  it('aceita e normaliza (trim) uma mensagem válida', () => {
    expect(validateMessageBody('  Sim, exactamente.  ')).toEqual({
      ok: true,
      value: 'Sim, exactamente.',
    });
  });

  it('aceita exactamente no limite mínimo', () => {
    const exact = 'x'.repeat(MESSAGE_BODY_MIN);
    expect(validateMessageBody(exact)).toEqual({ ok: true, value: exact });
  });
});

describe('isThreadCode', () => {
  it('aceita um código no formato LOGOS-XXXXXX (alfabeto sem ambíguos)', () => {
    expect(isThreadCode('LOGOS-7F3AKM')).toBe(true);
    expect(isThreadCode('LOGOS-ABCDEF')).toBe(true);
  });

  it('rejeita comprimento errado, prefixo errado e caracteres ambíguos', () => {
    expect(isThreadCode('LOGOS-7F3AK')).toBe(false); // 5 chars
    expect(isThreadCode('LOGOS-7F3AKMN')).toBe(false); // 7 chars
    expect(isThreadCode('logos-7F3AKM')).toBe(false); // minúsculas
    expect(isThreadCode('LOGOS-7F3AKO')).toBe(false); // 'O' ambíguo
    expect(isThreadCode('LOGOS-7F3AK1')).toBe(false); // '1' ambíguo
    expect(isThreadCode('OUTRO-7F3AKM')).toBe(false); // prefixo
    expect(isThreadCode(null)).toBe(false);
  });
});
