import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockInsert, mockDeleteEq1, mockDeleteEq2, mockRevalidatePath } =
  vi.hoisted(() => ({
    mockGetCurrentUser: vi.fn(),
    mockInsert: vi.fn(),
    mockDeleteEq1: vi.fn(),
    mockDeleteEq2: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      delete: vi.fn(() => ({
        eq: vi.fn((col: string, val: string) => {
          mockDeleteEq1(col, val);
          return {
            eq: vi.fn((col2: string, val2: string) => {
              mockDeleteEq2(col2, val2);
              return Promise.resolve({ error: null });
            }),
          };
        }),
      })),
    })),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { markLessonCompleteAction, unmarkLessonCompleteAction } from './completion-actions';

function makeProfile(): Profile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role: 'user',
    createdAt: '2026-05-20T00:00:00Z',
  };
}

const LESSON_ID = '22222222-2222-4222-8222-222222222222';

describe('markLessonCompleteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await markLessonCompleteAction(LESSON_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/iniciar sessão/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa lessonId não-UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await markLessonCompleteAction('not-uuid');
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/aula inválida/i) });
  });

  it('insere e revalida quando válido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await markLessonCompleteAction(LESSON_ID);
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: makeProfile().id,
      lesson_id: LESSON_ID,
    });
    expect(result).toEqual({ ok: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/conteudos', 'layout');
  });

  it('trata 23505 (duplicate) como sucesso idempotente', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    mockInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate' } });
    const result = await markLessonCompleteAction(LESSON_ID);
    expect(result).toEqual({ ok: true });
    expect(mockRevalidatePath).toHaveBeenCalled();
  });

  it('propaga outros erros de DB', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    mockInsert.mockResolvedValue({ error: { code: '42501', message: 'permission denied' } });
    const result = await markLessonCompleteAction(LESSON_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/permission denied/i) });
  });
});

describe('unmarkLessonCompleteAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await unmarkLessonCompleteAction(LESSON_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/iniciar sessão/i) });
  });

  it('recusa lessonId não-UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await unmarkLessonCompleteAction('not-uuid');
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/aula inválida/i) });
  });

  it('apaga com user_id + lesson_id e revalida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await unmarkLessonCompleteAction(LESSON_ID);
    expect(mockDeleteEq1).toHaveBeenCalledWith('user_id', makeProfile().id);
    expect(mockDeleteEq2).toHaveBeenCalledWith('lesson_id', LESSON_ID);
    expect(result).toEqual({ ok: true });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/conteudos', 'layout');
  });
});
