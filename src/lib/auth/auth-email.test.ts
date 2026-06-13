import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMaybeSingle, mockGetUserById } = vi.hoisted(() => ({
  mockMaybeSingle: vi.fn(),
  mockGetUserById: vi.fn(),
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
      })),
    })),
    auth: { admin: { getUserById: mockGetUserById } },
  })),
}));

import { getAuthEmailByProfileId } from './index';

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';

describe('getAuthEmailByProfileId (V3.6 PR3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve o email do aluno via external_auth_id', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { external_auth_id: 'ext-1' }, error: null });
    mockGetUserById.mockResolvedValue({ data: { user: { email: 'aluno@exemplo.pt' } }, error: null });

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
