import { describe, it, expect } from 'vitest';

import type { VisibleCourse } from './visibility';
import { defaultSortKey, isSortKey, sortCourses, type SortKey } from './sort';

function course(id: string, title: string): VisibleCourse {
  return { id, title, description: null, icon: null, bannerUrl: null, hasLessons: true };
}

const ALL = [
  course('a', 'Mateus'),
  course('b', 'Marcos'),
  course('c', 'Lucas'),
  course('d', 'João'),
];

describe('isSortKey', () => {
  it('aceita as 4 chaves válidas', () => {
    for (const k of ['por-comecar', 'concluidos', 'a-z', 'z-a']) {
      expect(isSortKey(k)).toBe(true);
    }
  });
  it('rejeita outros valores', () => {
    expect(isSortKey('xyz')).toBe(false);
    expect(isSortKey(null)).toBe(false);
    expect(isSortKey(123)).toBe(false);
  });
});

describe('defaultSortKey', () => {
  it('autenticado → por-comecar', () => {
    expect(defaultSortKey(true)).toBe('por-comecar');
  });
  it('anon → a-z', () => {
    expect(defaultSortKey(false)).toBe('a-z');
  });
});

describe('sortCourses', () => {
  const empty = new Set<string>();

  it('a-z ordena alfabético asc', () => {
    const result = sortCourses(ALL, 'a-z', false, empty, empty);
    expect(result.map((c) => c.title)).toEqual(['João', 'Lucas', 'Marcos', 'Mateus']);
  });

  it('z-a ordena alfabético desc', () => {
    const result = sortCourses(ALL, 'z-a', false, empty, empty);
    expect(result.map((c) => c.title)).toEqual(['Mateus', 'Marcos', 'Lucas', 'João']);
  });

  it('anon com por-comecar cai para a-z', () => {
    const result = sortCourses(ALL, 'por-comecar', false, empty, empty);
    expect(result.map((c) => c.title)).toEqual(['João', 'Lucas', 'Marcos', 'Mateus']);
  });

  it('por-comecar: não-começados → em-curso → concluídos', () => {
    // b (Marcos) = enrolled; c (Lucas) = completed; a, d = not-started
    const enrolled = new Set(['b']);
    const completed = new Set(['c']);
    const result = sortCourses(ALL, 'por-comecar', true, enrolled, completed);
    // not-started alfabético: João, Mateus; depois enrolled (Marcos); depois completed (Lucas)
    expect(result.map((c) => c.title)).toEqual(['João', 'Mateus', 'Marcos', 'Lucas']);
  });

  it('concluidos: concluídos → em-curso → não-começados', () => {
    const enrolled = new Set(['b']);
    const completed = new Set(['c', 'a']);
    const result = sortCourses(ALL, 'concluidos', true, enrolled, completed);
    // completed alfabético: Lucas, Mateus; depois enrolled (Marcos); depois not-started (João)
    expect(result.map((c) => c.title)).toEqual(['Lucas', 'Mateus', 'Marcos', 'João']);
  });

  it('mesma ordem dentro de um grupo é alfabética', () => {
    const result = sortCourses(ALL, 'por-comecar', true, new Set(), new Set());
    expect(result.map((c) => c.title)).toEqual(['João', 'Lucas', 'Marcos', 'Mateus']);
  });

  it('não muta o array de input', () => {
    const original = [...ALL];
    sortCourses(ALL, 'z-a', false, new Set(), new Set());
    expect(ALL).toEqual(original);
  });

  it('aceita todos os SortKey sem lançar', () => {
    const keys: SortKey[] = ['por-comecar', 'concluidos', 'a-z', 'z-a'];
    for (const k of keys) {
      expect(() => sortCourses(ALL, k, true, new Set(), new Set())).not.toThrow();
    }
  });
});
