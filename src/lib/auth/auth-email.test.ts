import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMaybeSingle, mockGetUserById, mockProfilesIn, mockListUsers } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockGetUserById: vi.fn(),
  mockProfilesIn: vi.fn(),
  mockListUsers: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: () => undefined }),
}));

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));

vi.mock('./service-client', () => ({
  getServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
        in: vi.fn(() => ({ returns: mockProfilesIn })),
      })),
    })),
    auth: { admin: { getUserById: mockGetUserById, listUsers: mockListUsers } },
  })),
}));

import { getAuthEmailByProfileId, getAuthEmailsByProfileIds } from './index';

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

describe('getAuthEmailByProfileId (V3.6 PR3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve o email do aluno via external_auth_id', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { external_auth_id: 'ext-1' }, error: null });
    mockGetUserById.mockResolvedValue({
      data: { user: { email: 'aluno@exemplo.pt' } },
      error: null,
    });

    await expect(getAuthEmailByProfileId(PROFILE_ID)).resolves.toBe('aluno@exemplo.pt');
    expect(mockGetUserById).toHaveBeenCalledWith('ext-1');
  });

  it('devolve null quando o perfil não existe', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getAuthEmailByProfileId(PROFILE_ID)).resolves.toBeNull();
    expect(mockGetUserById).not.toHaveBeenCalled();
  });

  it('devolve null quando o lookup do perfil falha', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await expect(getAuthEmailByProfileId(PROFILE_ID)).resolves.toBeNull();
  });

  it('devolve null quando o lookup de auth.users falha', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { external_auth_id: 'ext-1' }, error: null });
    mockGetUserById.mockResolvedValue({ data: { user: null }, error: { message: 'nope' } });
    await expect(getAuthEmailByProfileId(PROFILE_ID)).resolves.toBeNull();
  });

  it('devolve null quando o utilizador de identidade não tem email', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { external_auth_id: 'ext-1' }, error: null });
    mockGetUserById.mockResolvedValue({ data: { user: { email: null } }, error: null });
    await expect(getAuthEmailByProfileId(PROFILE_ID)).resolves.toBeNull();
  });
});

describe('getAuthEmailsByProfileIds (lote)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve Map vazio quando a lista é vazia (sem chamadas)', async () => {
    const map = await getAuthEmailsByProfileIds([]);
    expect(map.size).toBe(0);
    expect(mockListUsers).not.toHaveBeenCalled();
  });

  it('cruza external_auth_id → email para os perfis pedidos', async () => {
    mockProfilesIn.mockResolvedValue({
      data: [
        { id: 'p1', external_auth_id: 'ext-1' },
        { id: 'p2', external_auth_id: 'ext-2' },
      ],
      error: null,
    });
    mockListUsers.mockResolvedValue({
      data: {
        users: [
          { id: 'ext-1', email: 'um@exemplo.pt' },
          { id: 'ext-2', email: 'dois@exemplo.pt' },
          { id: 'ext-3', email: 'outro@exemplo.pt' },
        ],
      },
      error: null,
    });

    const map = await getAuthEmailsByProfileIds(['p1', 'p2']);
    expect(map.get('p1')).toBe('um@exemplo.pt');
    expect(map.get('p2')).toBe('dois@exemplo.pt');
    expect(map.size).toBe(2);
  });

  it('omite perfis sem email correspondente', async () => {
    mockProfilesIn.mockResolvedValue({
      data: [
        { id: 'p1', external_auth_id: 'ext-1' },
        { id: 'p2', external_auth_id: 'ext-x' },
      ],
      error: null,
    });
    mockListUsers.mockResolvedValue({
      data: { users: [{ id: 'ext-1', email: 'um@exemplo.pt' }] },
      error: null,
    });

    const map = await getAuthEmailsByProfileIds(['p1', 'p2']);
    expect(map.get('p1')).toBe('um@exemplo.pt');
    expect(map.has('p2')).toBe(false);
    expect(map.size).toBe(1);
  });

  it('devolve Map vazio quando o lookup de perfis falha (sem listar identidade)', async () => {
    mockProfilesIn.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const map = await getAuthEmailsByProfileIds(['p1']);
    expect(map.size).toBe(0);
    expect(mockListUsers).not.toHaveBeenCalled();
  });
});
