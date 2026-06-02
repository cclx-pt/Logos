import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockRpc, mockSignOut, mockRedirect, mockGetServerClient } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockSignOut: vi.fn(),
  mockRedirect: vi.fn(),
  mockGetServerClient: vi.fn(),
}));

vi.mock('./index', () => ({
  getServerClient: mockGetServerClient,
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

import { deleteAccountAction } from './actions';

describe('deleteAccountAction (V2.5 — RGPD art. 17)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetServerClient.mockResolvedValue({
      rpc: mockRpc,
      auth: { signOut: mockSignOut },
    });
  });

  it('chama a RPC delete_own_account, termina a sessão e redireciona para a home', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });

    await deleteAccountAction();

    expect(mockRpc).toHaveBeenCalledWith('delete_own_account');
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('não passa nenhum id à RPC (o alvo é sempre o próprio caller via auth.uid)', async () => {
    mockRpc.mockResolvedValue({ error: null });
    mockSignOut.mockResolvedValue({ error: null });

    await deleteAccountAction();

    expect(mockRpc).toHaveBeenCalledWith('delete_own_account');
    expect(mockRpc.mock.calls[0]).toHaveLength(1);
  });

  it('lança e não termina sessão nem redireciona se a RPC falhar', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'boom' } });

    await expect(deleteAccountAction()).rejects.toThrow(/Falha a apagar a conta/);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
