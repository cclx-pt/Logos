import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockUpdateEq, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      update: vi.fn(() => ({ eq: mockUpdateEq })),
    })),
  })),
}));

vi.mock('next/cache', () => ({ revalidatePath: mockRevalidatePath }));

import { setQuestionStatusAction } from './actions';

function makeProfile(role: Profile['role']): Profile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    externalAuthId: 'auth-uid',
    displayName: 'Admin',
    role,
    createdAt: '2026-06-12T00:00:00Z',
  };
}

const QUESTION_ID = '22222222-2222-4222-8222-222222222222';

function formDataOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe('setQuestionStatusAction (V3.5 PR3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const r = await setQuestionStatusAction(
      formDataOf({ questionId: QUESTION_ID, status: 'answered' }),
    );
    expect(r.ok).toBe(false);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('recusa um utilizador normal (regra dura: actions de admin recusam user)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user'));
    const r = await setQuestionStatusAction(
      formDataOf({ questionId: QUESTION_ID, status: 'answered' }),
    );
    expect(r.ok).toBe(false);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('rejeita questionId inválido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin'));
    const r = await setQuestionStatusAction(formDataOf({ questionId: 'nope', status: 'answered' }));
    expect(r.ok).toBe(false);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('rejeita estado inválido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin'));
    const r = await setQuestionStatusAction(
      formDataOf({ questionId: QUESTION_ID, status: 'done' }),
    );
    expect(r.ok).toBe(false);
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('admin actualiza o estado e revalida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin'));
    const r = await setQuestionStatusAction(
      formDataOf({ questionId: QUESTION_ID, status: 'archived' }),
    );
    expect(r.ok).toBe(true);
    expect(mockUpdateEq).toHaveBeenCalledWith('id', QUESTION_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/perguntas');
  });

  it('super_admin também pode', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin'));
    const r = await setQuestionStatusAction(formDataOf({ questionId: QUESTION_ID, status: 'new' }));
    expect(r.ok).toBe(true);
  });

  it('devolve erro quando o UPDATE falha', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin'));
    mockUpdateEq.mockResolvedValue({ error: { message: 'rls' } });
    const r = await setQuestionStatusAction(
      formDataOf({ questionId: QUESTION_ID, status: 'answered' }),
    );
    expect(r.ok).toBe(false);
  });
});
