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

import { getCourseProgressForUser } from './progress';

type Builder = {
  select: (...args: unknown[]) => Builder;
  in: (...args: unknown[]) => Builder;
  returns: () => Promise<QResp>;
};

function makeBuilder(response: QResp): Builder {
  const builder: Builder = {
    select: () => builder,
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

describe('getCourseProgressForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve {} quando courseIds é vazio (sem touch à DB)', async () => {
    const result = await getCourseProgressForUser([]);
    expect(result).toEqual({});
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('devolve {} quando não há sessão (anónimos)', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await getCourseProgressForUser(['a', 'b']);
    expect(result).toEqual({});
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('marca todos os ids como started=false, completed=false quando user não tem progresso', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log' || table === 'course_completions') {
        return makeBuilder({ data: [], error: null });
      }
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getCourseProgressForUser(['a', 'b']);
    expect(result).toEqual({
      a: { started: false, completed: false },
      b: { started: false, completed: false },
    });
  });

  it('marca started=true se há entrada em course_access_log para o id', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({ data: [{ course_id: 'a' }, { course_id: 'a' }], error: null });
      if (table === 'course_completions') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getCourseProgressForUser(['a', 'b']);
    expect(result.a).toEqual({ started: true, completed: false });
    expect(result.b).toEqual({ started: false, completed: false });
  });

  it('marca completed=true se há row em course_completions para o id', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({ data: [{ course_id: 'a' }], error: null });
      if (table === 'course_completions')
        return makeBuilder({ data: [{ course_id: 'a' }], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    const result = await getCourseProgressForUser(['a']);
    expect(result.a).toEqual({ started: true, completed: true });
  });

  it('lança Error quando a query de access log falha', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log')
        return makeBuilder({ data: null, error: { message: 'rls denied' } });
      if (table === 'course_completions') return makeBuilder({ data: [], error: null });
      throw new Error(`unexpected table: ${table}`);
    });

    await expect(getCourseProgressForUser(['a'])).rejects.toThrow(/rls denied/i);
  });

  it('lança Error quando a query de completions falha', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockImplementation((table: string) => {
      if (table === 'course_access_log') return makeBuilder({ data: [], error: null });
      if (table === 'course_completions')
        return makeBuilder({ data: null, error: { message: 'completion error' } });
      throw new Error(`unexpected table: ${table}`);
    });

    await expect(getCourseProgressForUser(['a'])).rejects.toThrow(/completion error/i);
  });
});
