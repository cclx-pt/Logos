import { describe, it, expect } from 'vitest';

import { aggregateCourseDetail, buildFinishers, type CourseDetailInput } from './stats-detail';

const base: CourseDetailInput = {
  modules: [],
  lessons: [],
  views: [],
  completions: [],
  accesses: [],
  courseCompletionsCount: 0,
};

describe('aggregateCourseDetail', () => {
  it('conta visitas, visitantes únicos e conclusões por aula', () => {
    const result = aggregateCourseDetail({
      ...base,
      modules: [{ id: 'm1', title: 'Módulo 1', position: 0 }],
      lessons: [
        { id: 'l1', title: 'Aula 1', module_id: 'm1', position: 0 },
        { id: 'l2', title: 'Aula 2', module_id: 'm1', position: 1 },
      ],
      views: [
        { lesson_id: 'l1', user_id: 'u1' },
        { lesson_id: 'l1', user_id: 'u1' }, // mesma pessoa, 2 visitas
        { lesson_id: 'l1', user_id: 'u2' },
        { lesson_id: 'l2', user_id: 'u1' },
      ],
      completions: [{ lesson_id: 'l1' }, { lesson_id: 'l1' }],
    });

    const l1 = result.lessons.find((l) => l.lessonId === 'l1')!;
    expect(l1).toMatchObject({
      views: 3,
      uniqueViewers: 2,
      completions: 2,
      moduleTitle: 'Módulo 1',
    });
    const l2 = result.lessons.find((l) => l.lessonId === 'l2')!;
    expect(l2).toMatchObject({ views: 1, uniqueViewers: 1, completions: 0 });
  });

  it('soma por módulo e ordena módulos/aulas por visitas desc', () => {
    const result = aggregateCourseDetail({
      ...base,
      modules: [
        { id: 'm1', title: 'Alfa', position: 0 },
        { id: 'm2', title: 'Beta', position: 1 },
      ],
      lessons: [
        { id: 'l1', title: 'A1', module_id: 'm1', position: 0 },
        { id: 'l2', title: 'B1', module_id: 'm2', position: 0 },
      ],
      views: [
        { lesson_id: 'l2', user_id: 'u1' },
        { lesson_id: 'l2', user_id: 'u2' },
        { lesson_id: 'l1', user_id: 'u1' },
      ],
    });

    // m2 (Beta) tem 2 visitas, m1 (Alfa) tem 1 → Beta primeiro.
    expect(result.modules.map((m) => m.title)).toEqual(['Beta', 'Alfa']);
    expect(result.modules.find((m) => m.moduleId === 'm1')!.lessonCount).toBe(1);
    // Aulas ordenadas por visitas desc: B1 (2) antes de A1 (1).
    expect(result.lessons.map((l) => l.title)).toEqual(['B1', 'A1']);
  });

  it('conta inscrições activas pela row mais recente e acessos totais/únicos', () => {
    const result = aggregateCourseDetail({
      ...base,
      accesses: [
        {
          user_id: 'u1',
          accessed_at: '2026-05-01T00:00:00Z',
          unenrolled_at: '2026-05-02T00:00:00Z',
        },
        { user_id: 'u1', accessed_at: '2026-05-03T00:00:00Z', unenrolled_at: null }, // re-inscrito
        { user_id: 'u2', accessed_at: '2026-05-01T00:00:00Z', unenrolled_at: null },
        {
          user_id: 'u3',
          accessed_at: '2026-05-01T00:00:00Z',
          unenrolled_at: '2026-05-02T00:00:00Z',
        }, // saiu
      ],
      courseCompletionsCount: 5,
    });
    expect(result.totals.accesses).toBe(4);
    expect(result.totals.uniqueUsers).toBe(3);
    expect(result.totals.enrolls).toBe(2); // u1 + u2
    expect(result.totals.completions).toBe(5);
  });
});

describe('buildFinishers (gate de papel)', () => {
  const completions = [
    { user_id: 'u1', completed_at: '2026-05-01T00:00:00Z' },
    { user_id: 'u2', completed_at: '2026-05-03T00:00:00Z' },
  ];
  const names = new Map([
    ['u1', 'Ana'],
    ['u2', 'Bruno'],
  ]);

  it('devolve null quando o caller NÃO é super_admin', () => {
    expect(buildFinishers(false, completions, names)).toBeNull();
  });

  it('devolve a lista com nomes, mais recente primeiro, para super_admin', () => {
    const result = buildFinishers(true, completions, names);
    expect(result).toEqual([
      { userId: 'u2', name: 'Bruno', completedAt: '2026-05-03T00:00:00Z' },
      { userId: 'u1', name: 'Ana', completedAt: '2026-05-01T00:00:00Z' },
    ]);
  });

  it('usa fallback quando o nome não está no mapa', () => {
    const result = buildFinishers(
      true,
      [{ user_id: 'x', completed_at: '2026-05-01T00:00:00Z' }],
      new Map(),
    );
    expect(result![0]!.name).toBe('Utilizador removido');
  });
});
