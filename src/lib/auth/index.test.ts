import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: () => [],
    set: () => undefined,
  }),
}));

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
    })),
  })),
}));

import { getCurrentUser } from './index';

describe('lib/auth/getCurrentUser (V2 PR2)', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'test-publishable-key';
    vi.clearAllMocks();
  });

  it('devolve null quando não há sessão (auth.getUser → null)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('devolve null quando há sessão mas profile ainda não existe', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uid-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('devolve null quando o lookup do profile devolve erro', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uid-1' } } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'rls denied' } });
    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it('mapeia ProfileRow para Profile (camelCase) quando sessão + profile existem', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth-uid-1' } } });
    mockMaybeSingle.mockResolvedValue({
      data: {
        id: 'profile-uuid',
        external_auth_id: 'auth-uid-1',
        display_name: 'João Ribeiro',
        role: 'user',
        created_at: '2026-05-14T00:00:00Z',
      },
      error: null,
    });

    await expect(getCurrentUser()).resolves.toEqual({
      id: 'profile-uuid',
      externalAuthId: 'auth-uid-1',
      displayName: 'João Ribeiro',
      role: 'user',
      createdAt: '2026-05-14T00:00:00Z',
    });
  });
});
