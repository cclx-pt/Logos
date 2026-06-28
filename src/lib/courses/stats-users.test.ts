import { describe, it, expect } from 'vitest';

import {
  activeEnrollmentKeys,
  aggregateUserDetail,
  aggregateUsersOverview,
  type AccessRow,
} from './stats-users';

function access(
  user_id: string,
  course_id: string,
  accessed_at: string,
  unenrolled_at: string | null = null,
): AccessRow {
  return { user_id, course_id, accessed_at, unenrolled_at };
}

describe('activeEnrollmentKeys', () => {
  it('considera só a row mais recente por (user, curso)', () => {
    const keys = activeEnrollmentKeys([
      access('u1', 'c1', '2026-05-01T00:00:00Z', '2026-05-02T00:00:00Z'),
      access('u1', 'c1', '2026-05-03T00:00:00Z', null), // re-inscrito → activo
      access('u2', 'c1', '2026-05-05T00:00:00Z', '2026-05-06T00:00:00Z'), // saiu → não activo
    ]);
    expect(keys.has('u1 c1')).toBe(true);
    expect(keys.has('u2 c1')).toBe(false);
  });
});

describe('aggregateUsersOverview', () => {
  it('conta inscritos activos e terminados por utilizador, ordenado por nome', () => {
    const rows = aggregateUsersOverview({
      profiles: [
        { id: 'u1', display_name: 'Bruno', role: 'user' },
        { id: 'u2', display_name: 'Ana', role: 'admin' },
        { id: 'u3', display_name: 'Carlos', role: 'user' }, // sem actividade
      ],
      accesses: [
        access('u1', 'c1', '2026-05-01T00:00:00Z', null),
        access('u1', 'c2', '2026-05-01T00:00:00Z', null),
        access('u2', 'c1', '2026-05-01T00:00:00Z', '2026-05-02T00:00:00Z'), // saiu
      ],
      courseCompletions: [
        { user_id: 'u1', course_id: 'c1' },
        { user_id: 'u2', course_id: 'c1' },
      ],
    });

    expect(rows.map((r) => r.name)).toEqual(['Ana', 'Bruno', 'Carlos']); // ordem alfabética
    const bruno = rows.find((r) => r.userId === 'u1')!;
    expect(bruno).toMatchObject({ enrolled: 2, completed: 1 });
    const ana = rows.find((r) => r.userId === 'u2')!;
    expect(ana).toMatchObject({ enrolled: 0, completed: 1 }); // saiu mas concluiu antes
    const carlos = rows.find((r) => r.userId === 'u3')!;
    expect(carlos).toMatchObject({ enrolled: 0, completed: 0 });
  });
});

describe('aggregateUserDetail', () => {
  it('lista cursos inscritos (activos) e terminados com título e data', () => {
    const result = aggregateUserDetail({
      courses: [
        { id: 'c1', title: 'Génesis' },
        { id: 'c2', title: 'Êxodo' },
        { id: 'c3', title: 'Salmos' },
      ],
      accesses: [
        access('u1', 'c1', '2026-05-01T00:00:00Z', null), // inscrito
        access('u1', 'c2', '2026-05-01T00:00:00Z', '2026-05-02T00:00:00Z'), // saiu
      ],
      completions: [{ course_id: 'c3', completed_at: '2026-05-10T00:00:00Z' }],
    });

    expect(result.enrolled).toEqual([{ courseId: 'c1', title: 'Génesis' }]);
    expect(result.completed).toEqual([
      { courseId: 'c3', title: 'Salmos', completedAt: '2026-05-10T00:00:00Z' },
    ]);
  });

  it('usa fallback quando o curso já não existe', () => {
    const result = aggregateUserDetail({
      courses: [],
      accesses: [access('u1', 'cX', '2026-05-01T00:00:00Z', null)],
      completions: [],
    });
    expect(result.enrolled[0]!.title).toBe('Curso removido');
  });
});
