import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockFrom, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockFrom: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({ from: mockFrom })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { getEnrollmentState, enrollAction, unenrollAction } from './enrollment';

const VALID_COURSE_ID = '11111111-1111-1111-1111-111111111111';
const INVALID_COURSE_ID = 'not-a-uuid';

function profile(): Profile {
  return {
    id: 'profile-1',
    externalAuthId: 'auth-1',
    displayName: 'João',
    role: 'user',
    createdAt: '2026-05-01T00:00:00Z',
  };
}

type QResp = { data: unknown; error: unknown };

function makeSelectBuilder(response: QResp) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => Promise.resolve(response),
  };
  return builder;
}

function makeInsertBuilder(response: { error: unknown }) {
  return {
    insert: () => Promise.resolve(response),
  };
}

function makeUpdateBuilder(response: { error: unknown }) {
  const builder = {
    update: () => builder,
    eq: () => Promise.resolve(response),
  };
  return builder;
}

describe('getEnrollmentState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve "anon" quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const state = await getEnrollmentState(VALID_COURSE_ID);
    expect(state).toBe('anon');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('devolve "not-enrolled" quando courseId não é UUID válido', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    const state = await getEnrollmentState(INVALID_COURSE_ID);
    expect(state).toBe('not-enrolled');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('devolve "not-enrolled" quando o user nunca acedeu', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(makeSelectBuilder({ data: null, error: null }));
    const state = await getEnrollmentState(VALID_COURSE_ID);
    expect(state).toBe('not-enrolled');
  });

  it('devolve "enrolled" quando a row mais recente tem unenrolled_at null', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(
      makeSelectBuilder({ data: { id: 'r1', unenrolled_at: null }, error: null }),
    );
    const state = await getEnrollmentState(VALID_COURSE_ID);
    expect(state).toBe('enrolled');
  });

  it('devolve "not-enrolled" quando a row mais recente tem unenrolled_at set', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(
      makeSelectBuilder({
        data: { id: 'r1', unenrolled_at: '2026-05-26T10:00:00Z' },
        error: null,
      }),
    );
    const state = await getEnrollmentState(VALID_COURSE_ID);
    expect(state).toBe('not-enrolled');
  });

  it('devolve "not-enrolled" em caso de erro Supabase', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(
      makeSelectBuilder({ data: null, error: { message: 'rls denied' } }),
    );
    const state = await getEnrollmentState(VALID_COURSE_ID);
    expect(state).toBe('not-enrolled');
  });
});

describe('enrollAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falha quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await enrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(false);
  });

  it('falha quando courseId não é UUID válido', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    const result = await enrollAction(INVALID_COURSE_ID);
    expect(result.ok).toBe(false);
  });

  it('insere row em course_access_log e revalida paths', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(makeInsertBuilder({ error: null }));
    const result = await enrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/conteudos/${VALID_COURSE_ID}`);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/meus-cursos');
  });

  it('falha quando o INSERT falha', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(makeInsertBuilder({ error: { message: 'rls' } }));
    const result = await enrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(false);
  });
});

describe('unenrollAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('falha quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await unenrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(false);
  });

  it('falha quando o utilizador não tem inscrição activa', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom.mockReturnValue(makeSelectBuilder({ data: null, error: null }));
    const result = await unenrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(false);
  });

  it('atualiza unenrolled_at da row activa e revalida', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    // Primeiro from: SELECT da row activa
    // Segundo from: UPDATE
    mockFrom
      .mockReturnValueOnce(makeSelectBuilder({ data: { id: 'r1' }, error: null }))
      .mockReturnValueOnce(makeUpdateBuilder({ error: null }));
    const result = await unenrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(true);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/conteudos/${VALID_COURSE_ID}`);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/meus-cursos');
  });

  it('falha quando o UPDATE falha', async () => {
    mockGetCurrentUser.mockResolvedValue(profile());
    mockFrom
      .mockReturnValueOnce(makeSelectBuilder({ data: { id: 'r1' }, error: null }))
      .mockReturnValueOnce(makeUpdateBuilder({ error: { message: 'rls' } }));
    const result = await unenrollAction(VALID_COURSE_ID);
    expect(result.ok).toBe(false);
  });
});
