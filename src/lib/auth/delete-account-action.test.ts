import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  mockGetCurrentUser,
  mockSignOut,
  mockRedirect,
  mockFrom,
  mockDelete,
  mockEq,
  mockDeleteUser,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockSignOut: vi.fn(),
  mockRedirect: vi.fn(),
  mockFrom: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockDeleteUser: vi.fn(),
}));

vi.mock('./index', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({ auth: { signOut: mockSignOut } })),
}));

vi.mock('./service-client', () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { deleteUser: mockDeleteUser } },
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { deleteAccountAction } from './actions';

const PROFILE = {
  id: 'profile-1',
  externalAuthId: 'auth-uid-1',
  displayName: 'Joana',
  role: 'user' as const,
  createdAt: '2026-01-01T00:00:00Z',
};

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('deleteAccountAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Cadeia svc.from('profiles').delete().eq('id', ...) → { error: null }
    mockEq.mockResolvedValue({ error: null });
    mockDelete.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ delete: mockDelete });
    mockDeleteUser.mockResolvedValue({ error: null });
    mockGetCurrentUser.mockResolvedValue(PROFILE);
  });

  it('recusa quando a confirmação não é APAGAR, sem tocar na sessão nem na BD', async () => {
    const result = await deleteAccountAction({ status: 'idle' }, fd({ confirm: 'sim' }));
    expect(result).toEqual({ status: 'error', message: expect.stringMatching(/APAGAR/i) });
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('aceita a confirmação com espaços e minúsculas (normaliza para APAGAR)', async () => {
    await deleteAccountAction({ status: 'idle' }, fd({ confirm: '  apagar  ' }));
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockRedirect).toHaveBeenCalledWith('/?conta-apagada=1');
  });

  it('devolve erro de sessão quando não há utilizador autenticado', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await deleteAccountAction({ status: 'idle' }, fd({ confirm: 'APAGAR' }));
    expect(result).toEqual({ status: 'error', message: expect.stringMatching(/sessão/i) });
    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it('apaga o profile da própria sessão (sem id vindo do cliente) e depois a identidade', async () => {
    await deleteAccountAction({ status: 'idle' }, fd({ confirm: 'APAGAR' }));
    expect(mockFrom).toHaveBeenCalledWith('profiles');
    expect(mockEq).toHaveBeenCalledWith('id', PROFILE.id);
    expect(mockDeleteUser).toHaveBeenCalledWith(PROFILE.externalAuthId);
    // Ordem obrigatória: profile (cascata) antes da identidade (FK RESTRICT).
    expect(mockEq.mock.invocationCallOrder[0]!).toBeLessThan(
      mockDeleteUser.mock.invocationCallOrder[0]!,
    );
    expect(mockSignOut).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/?conta-apagada=1');
  });

  it('não apaga a identidade nem redireciona se o profile falhar a apagar', async () => {
    mockEq.mockResolvedValue({ error: { message: 'restrict violation' } });
    const result = await deleteAccountAction({ status: 'idle' }, fd({ confirm: 'APAGAR' }));
    expect(result).toEqual({ status: 'error', message: expect.stringMatching(/logos@cclx\.pt/i) });
    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });

  it('avisa de remoção parcial se a identidade falhar a apagar', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'auth delete failed' } });
    const result = await deleteAccountAction({ status: 'idle' }, fd({ confirm: 'APAGAR' }));
    expect(result).toEqual({
      status: 'error',
      message: expect.stringMatching(/parcialmente/i),
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
