import { describe, it, expect } from 'vitest';

import { aggregateOverview, type OverviewInput } from './overview-stats';

const empty: OverviewInput = {
  courses: [],
  modules: [],
  lessons: [],
  accesses: [],
  lessonCompletions: [],
  courseCompletions: [],
};

describe('aggregateOverview', () => {
  it('devolve tudo a zero e sem linhas quando não há dados', () => {
    const result = aggregateOverview(empty);
    expect(result.totals).toEqual({
      coursesPublished: 0,
      coursesDraft: 0,
      totalAccesses: 0,
      activeUsers: 0,
      lessonCompletions: 0,
      courseCompletions: 0,
    });
    expect(result.perCourse).toEqual([]);
  });

  it('separa cursos publicados de rascunhos', () => {
    const result = aggregateOverview({
      ...empty,
      courses: [
        { id: 'c1', title: 'Génesis', published_at: '2026-05-01T00:00:00Z' },
        { id: 'c2', title: 'Êxodo', published_at: null },
        { id: 'c3', title: 'Salmos', published_at: '2026-05-02T00:00:00Z' },
      ],
    });
    expect(result.totals.coursesPublished).toBe(2);
    expect(result.totals.coursesDraft).toBe(1);
    expect(result.perCourse).toHaveLength(3);
  });

  it('conta acessos totais e utilizadores activos com dedup global e por curso', () => {
    const result = aggregateOverview({
      ...empty,
      courses: [
        { id: 'c1', title: 'Génesis', published_at: '2026-05-01T00:00:00Z' },
        { id: 'c2', title: 'Êxodo', published_at: '2026-05-01T00:00:00Z' },
      ],
      accesses: [
        { course_id: 'c1', user_id: 'u1' },
        { course_id: 'c1', user_id: 'u1' }, // repetido — conta acesso, não user
        { course_id: 'c1', user_id: 'u2' },
        { course_id: 'c2', user_id: 'u1' }, // mesmo user noutro curso
      ],
    });

    expect(result.totals.totalAccesses).toBe(4);
    expect(result.totals.activeUsers).toBe(2); // u1, u2 globalmente

    const c1 = result.perCourse.find((r) => r.courseId === 'c1')!;
    const c2 = result.perCourse.find((r) => r.courseId === 'c2')!;
    expect(c1).toMatchObject({ accesses: 3, uniqueUsers: 2 });
    expect(c2).toMatchObject({ accesses: 1, uniqueUsers: 1 });
  });

  it('imputa conclusões de aulas ao curso via module → course', () => {
    const result = aggregateOverview({
      ...empty,
      courses: [
        { id: 'c1', title: 'Génesis', published_at: '2026-05-01T00:00:00Z' },
        { id: 'c2', title: 'Êxodo', published_at: '2026-05-01T00:00:00Z' },
      ],
      modules: [
        { id: 'm1', course_id: 'c1' },
        { id: 'm2', course_id: 'c2' },
      ],
      lessons: [
        { id: 'l1', module_id: 'm1' },
        { id: 'l2', module_id: 'm1' },
        { id: 'l3', module_id: 'm2' },
      ],
      lessonCompletions: [
        { lesson_id: 'l1' },
        { lesson_id: 'l1' }, // duas pessoas concluíram a mesma aula
        { lesson_id: 'l2' },
        { lesson_id: 'l3' },
        { lesson_id: 'orfa' }, // aula sem curso conhecido — ignorada por curso
      ],
    });

    expect(result.totals.lessonCompletions).toBe(5); // total conta tudo
    const c1 = result.perCourse.find((r) => r.courseId === 'c1')!;
    const c2 = result.perCourse.find((r) => r.courseId === 'c2')!;
    expect(c1.lessonCompletions).toBe(3); // l1 x2 + l2
    expect(c2.lessonCompletions).toBe(1); // l3
  });

  it('conta cursos concluídos a partir de course_completions', () => {
    const result = aggregateOverview({
      ...empty,
      courses: [{ id: 'c1', title: 'Génesis', published_at: '2026-05-01T00:00:00Z' }],
      courseCompletions: [{ course_id: 'c1' }, { course_id: 'c1' }],
    });
    expect(result.totals.courseCompletions).toBe(2);
  });

  it('ordena perCourse por acessos desc, com título a desempatar', () => {
    const result = aggregateOverview({
      ...empty,
      courses: [
        { id: 'c1', title: 'Beta', published_at: null },
        { id: 'c2', title: 'Alfa', published_at: null },
        { id: 'c3', title: 'Gama', published_at: null },
      ],
      accesses: [
        { course_id: 'c3', user_id: 'u1' },
        { course_id: 'c3', user_id: 'u2' },
        // c1 e c2 ficam empatados a 0 → desempate alfabético: Alfa antes de Beta
      ],
    });
    expect(result.perCourse.map((r) => r.title)).toEqual(['Gama', 'Alfa', 'Beta']);
  });

  it('inclui cursos sem actividade nenhuma com zeros', () => {
    const result = aggregateOverview({
      ...empty,
      courses: [{ id: 'c1', title: 'Génesis', published_at: null }],
    });
    expect(result.perCourse[0]).toEqual({
      courseId: 'c1',
      title: 'Génesis',
      published: false,
      accesses: 0,
      uniqueUsers: 0,
      lessonCompletions: 0,
    });
  });
});
