import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockMaybeSingle, mockUpdateEq, mockRevalidatePath } = vi.hoisted(
  () => ({
    mockGetCurrentUser: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockUpdateEq: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }),
);

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      update: vi.fn(() => ({
        eq: mockUpdateEq,
      })),
    })),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { setUserRoleAction } from './actions';

function makeProfile(role: Profile['role'], id: string): Profile {
  return {
    id,
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role,
    createdAt: '2026-05-14T00:00:00Z',
  };
}

const CALLER_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';

function formDataOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe('setUserRoleAction (V2 PR3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'admin' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super_admin/i) });
  });

  it('recusa quando caller é admin (não super_admin)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'admin' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super_admin/i) });
    expect(mockMaybeSingle).not.toHaveBeenCalled();
  });

  it('recusa quando targetId não é UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    const result = await setUserRoleAction(
      formDataOf({ targetId: 'not-a-uuid', newRole: 'admin' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/targetId/i) });
  });

  it('recusa newRole fora de {user, admin}', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    const result = await setUserRoleAction(
      formDataOf({ targetId: TARGET_ID, newRole: 'super_admin' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/newRole/i) });
  });

  it('recusa quando alvo é o próprio caller', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    const result = await setUserRoleAction(formDataOf({ targetId: CALLER_ID, newRole: 'admin' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/próprio/i) });
  });

  it('recusa quando alvo é super_admin', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { id: TARGET_ID, role: 'super_admin' },
      error: null,
    });
    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'user' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super administrador/i) });
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('no-op quando alvo já tem o role pedido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { id: TARGET_ID, role: 'admin' },
      error: null,
    });
    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'admin' }));
    expect(result).toEqual({ ok: true });
    expect(mockUpdateEq).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('promove user → admin e revalida o path', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { id: TARGET_ID, role: 'user' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'admin' }));

    expect(result).toEqual({ ok: true });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', TARGET_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/utilizadores');
  });

  it('propaga erro de DB ao update', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { id: TARGET_ID, role: 'user' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: { message: 'permission denied' } });

    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'admin' }));

    expect(result).toEqual({
      ok: false,
      error: expect.stringMatching(/permission denied/i),
    });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});
