import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

type QResp = { data: unknown; error: unknown };

const { mockGetCurrentUser, mockFrom } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({ from: mockFrom })),
}));

import { getStartedCoursesForUser } from './started';

type Builder = {
  select: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  in: (...args: unknown[]) => Builder;
  returns: () => Promise<QResp>;
};

function makeBuilder(response: QResp): Builder {
  const builder: Builder = {
    select: () => builder,
    order: () => builder,
    in: () => builder,
    returns: () => Promise.resolve(response),
  };
  return builder;
}

function profile(): Profile {
  return {
    id: 'profile-1',
    externalAuthId: 'auth-1',
    displayName: 'João',
    role: 'user',
    createdAt: '2026-05-01T00:00:00Z',
  };
}

const courseEmbed = {
  id: 'course-1',
  title: 'Marcos',
  description: 'Curso de Marcos',
  icon: 'cross',
  banner_storage_path: null,
  modules: [{ lessons: [{ count: 4 }] }],
};

describe('getStartedCoursesForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve [] quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await getStartedCoursesForUser();
    expect(result).toEqual([]);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('devolve [] quando o user nunca acedeu a um curso', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });
    const result = await getStartedCoursesForUser();
    expect(result).toEqual([]);
  });

  it('lança Error quando a query de access log falha', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({ data: null, error: { message: 'rls denied' } });
      throw new Error(`unexpected table: ${table}`);
    });
    await expect(getStartedCoursesForUser()).rejects.toThrow(/rls denied/i);
  });

  it('mapeia um acesso para um StartedCourse com completed=false por defeito', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({
          data: [
            { course_id: 'course-1', accessed_at: '2026-05-25T10:00:00Z', courses: courseEmbed },
          ],
          error: null,
        });
      if (table === 'course_completions') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getStartedCoursesForUser();
    expect(result).toEqual([
      {
        id: 'course-1',
        title: 'Marcos',
        description: 'Curso de Marcos',
        icon: 'cross',
        bannerUrl: null,
        hasLessons: true,
        completed: false,
        lastAccessedAt: '2026-05-25T10:00:00Z',
      },
    ]);
  });

  it('deduplica por course_id mantendo o acesso mais recente (ordered desc)', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({
          data: [
            // desc por accessed_at; primeiro é o mais recente
            { course_id: 'course-1', accessed_at: '2026-05-25T10:00:00Z', courses: courseEmbed },
            { course_id: 'course-1', accessed_at: '2026-05-20T09:00:00Z', courses: courseEmbed },
            { course_id: 'course-1', accessed_at: '2026-05-15T08:00:00Z', courses: courseEmbed },
          ],
          error: null,
        });
      if (table === 'course_completions') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getStartedCoursesForUser();
    expect(result).toHaveLength(1);
    expect(result[0].lastAccessedAt).toBe('2026-05-25T10:00:00Z');
  });

  it('filtra acessos a cursos despublicados (embed courses=null)', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({
          data: [
            { course_id: 'course-1', accessed_at: '2026-05-25T10:00:00Z', courses: courseEmbed },
            { course_id: 'course-bad', accessed_at: '2026-05-24T10:00:00Z', courses: null },
          ],
          error: null,
        });
      if (table === 'course_completions') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getStartedCoursesForUser();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('course-1');
  });

  it('marca completed=true quando o curso aparece em course_completions', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({
          data: [
            { course_id: 'course-1', accessed_at: '2026-05-25T10:00:00Z', courses: courseEmbed },
          ],
          error: null,
        });
      if (table === 'course_completions')
        return makeBuilder({ data: [{ course_id: 'course-1' }], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getStartedCoursesForUser();
    expect(result[0].completed).toBe(true);
  });

  it('lança Error quando a query de course_completions falha', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({
          data: [
            { course_id: 'course-1', accessed_at: '2026-05-25T10:00:00Z', courses: courseEmbed },
          ],
          error: null,
        });
      if (table === 'course_completions')
        return makeBuilder({ data: null, error: { message: 'rls error' } });
      throw new Error(`unexpected table: ${table}`);
    });

    await expect(getStartedCoursesForUser()).rejects.toThrow(/rls error/i);
  });

  it('hasLessons=false quando o curso embed não tem aulas', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({
          data: [
            {
              course_id: 'course-1',
              accessed_at: '2026-05-25T10:00:00Z',
              courses: { ...courseEmbed, modules: [{ lessons: [{ count: 0 }] }] },
            },
          ],
          error: null,
        });
      if (table === 'course_completions') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getStartedCoursesForUser();
    expect(result[0].hasLessons).toBe(false);
  });
});
