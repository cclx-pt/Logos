import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const {
  mockGetCurrentUser,
  mockMaybeSingle,
  mockUpdateEq,
  mockUpsert,
  mockDeleteEqEq,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockUpsert: vi.fn(),
  mockDeleteEqEq: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

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
      upsert: mockUpsert,
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: mockDeleteEqEq,
        })),
      })),
    })),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { assignTagAction, setUserRoleAction, unassignTagAction } from './actions';

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

  it('recusa newRole fora de {user, admin, super_admin}', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    const result = await setUserRoleAction(formDataOf({ targetId: TARGET_ID, newRole: 'root' }));
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

  it('promove admin → super_admin quando caller é super_admin', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { id: TARGET_ID, role: 'admin' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await setUserRoleAction(
      formDataOf({ targetId: TARGET_ID, newRole: 'super_admin' }),
    );

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

const TAG_ID = '33333333-3333-4333-8333-333333333333';

describe('assignTagAction (V3 PR1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await assignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('recusa quando caller é user (não admin nem super_admin)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await assignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('recusa userId inválido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await assignTagAction(formDataOf({ userId: 'not-uuid', tagId: TAG_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/userId/i) });
  });

  it('recusa tagId inválido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await assignTagAction(formDataOf({ userId: TARGET_ID, tagId: 'not-uuid' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/tagId/i) });
  });

  it('upserta idempotentemente quando caller é admin', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockUpsert.mockResolvedValue({ error: null });

    const result = await assignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: TARGET_ID, tag_id: TAG_ID, assigned_by: CALLER_ID },
      { onConflict: 'user_id,tag_id', ignoreDuplicates: true },
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/utilizadores');
  });

  it('aceita super_admin como caller', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockUpsert.mockResolvedValue({ error: null });
    const result = await assignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));
    expect(result).toEqual({ ok: true });
  });
});

describe('unassignTagAction (V3 PR1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await unassignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockDeleteEqEq).not.toHaveBeenCalled();
  });

  it('apaga a atribuição quando válida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockDeleteEqEq.mockResolvedValue({ error: null });

    const result = await unassignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockDeleteEqEq).toHaveBeenCalledWith('tag_id', TAG_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/utilizadores');
  });

  it('idempotente: não falha se a atribuição não existir (PK composta + RLS)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockDeleteEqEq.mockResolvedValue({ error: null });

    const result = await unassignTagAction(formDataOf({ userId: TARGET_ID, tagId: TAG_ID }));

    expect(result).toEqual({ ok: true });
  });
});
