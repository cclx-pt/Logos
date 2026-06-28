import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockInsert, mockUpdateEq, mockDeleteEq, mockRevalidatePath } =
  vi.hoisted(() => ({
    mockGetCurrentUser: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdateEq: vi.fn(),
    mockDeleteEq: vi.fn(),
    mockRevalidatePath: vi.fn(),
  }));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: mockInsert,
      update: vi.fn(() => ({ eq: mockUpdateEq })),
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
    })),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { createTagAction, updateTagAction, deleteTagAction } from './actions';

function makeProfile(role: Profile['role'], id: string): Profile {
  return {
    id,
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role,
    createdAt: '2026-05-14T00:00:00Z',
  };
}

const SUPER_ID = '11111111-1111-4111-8111-111111111111';
const TAG_ID = '22222222-2222-4222-8222-222222222222';

function formDataOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe('createTagAction (V3 PR1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await createTagAction(formDataOf({ label: 'Mentoria CCLX' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super_admin/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa quando caller é admin (não super_admin)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', SUPER_ID));
    const result = await createTagAction(formDataOf({ label: 'Mentoria' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super_admin/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa label vazia', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    const result = await createTagAction(formDataOf({ label: '   ' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/nome/i) });
  });

  it('recusa label demasiado longa', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    const result = await createTagAction(formDataOf({ label: 'x'.repeat(81) }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/nome/i) });
  });

  it('cria etiqueta e revalida path quando válida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    mockInsert.mockResolvedValue({ error: null });

    const result = await createTagAction(formDataOf({ label: 'Mentoria CCLX' }));

    expect(result).toEqual({ ok: true });
    expect(mockInsert).toHaveBeenCalledWith({
      label: 'Mentoria CCLX',
      created_by: SUPER_ID,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/etiquetas');
  });

  it('faz trim ao label antes de gravar', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    mockInsert.mockResolvedValue({ error: null });

    await createTagAction(formDataOf({ label: '  Mentoria CCLX  ' }));

    expect(mockInsert).toHaveBeenCalledWith({
      label: 'Mentoria CCLX',
      created_by: SUPER_ID,
    });
  });

  it('propaga erro de DB ao insert', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    mockInsert.mockResolvedValue({ error: { code: 'XX000', message: 'algo correu mal' } });

    const result = await createTagAction(formDataOf({ label: 'Mentoria' }));

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/algo correu mal/i) });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateTagAction (V3 PR1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', SUPER_ID));
    const result = await updateTagAction(formDataOf({ id: TAG_ID, label: 'Novo' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super_admin/i) });
    expect(mockUpdateEq).not.toHaveBeenCalled();
  });

  it('recusa quando id não é UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    const result = await updateTagAction(formDataOf({ id: 'not-uuid', label: 'Novo' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/id/i) });
  });

  it('actualiza e revalida quando válida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await updateTagAction(formDataOf({ id: TAG_ID, label: 'Mentoria 2026' }));

    expect(result).toEqual({ ok: true });
    expect(mockUpdateEq).toHaveBeenCalledWith('id', TAG_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/etiquetas');
  });
});

describe('deleteTagAction (V3 PR1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando caller é admin', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', SUPER_ID));
    const result = await deleteTagAction(formDataOf({ id: TAG_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/super_admin/i) });
    expect(mockDeleteEq).not.toHaveBeenCalled();
  });

  it('apaga e revalida quando válida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', SUPER_ID));
    mockDeleteEq.mockResolvedValue({ error: null });

    const result = await deleteTagAction(formDataOf({ id: TAG_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockDeleteEq).toHaveBeenCalledWith('id', TAG_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/etiquetas');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/utilizadores');
  });
});
