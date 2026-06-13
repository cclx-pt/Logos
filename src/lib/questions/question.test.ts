import { describe, it, expect } from 'vitest';

import {
  QUESTION_STATUSES,
  QUESTION_STATUS_LABEL,
  QUESTION_BODY_MIN,
  QUESTION_BODY_MAX,
  isQuestionStatus,
  validateQuestionBody,
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
