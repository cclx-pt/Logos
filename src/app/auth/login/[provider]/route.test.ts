import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignInWithOAuth, mockGetRouteHandlerClient } = vi.hoisted(() => ({
  mockSignInWithOAuth: vi.fn(),
  mockGetRouteHandlerClient: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getRouteHandlerClient: mockGetRouteHandlerClient,
}));

import { GET } from './route';

const ORIGIN = 'https://logos.cclx.pt';

function makeRequest(path: string): Request {
  return new Request(`${ORIGIN}${path}`, {
    headers: { 'x-forwarded-host': 'logos.cclx.pt', 'x-forwarded-proto': 'https' },
  });
}

function params(provider: string) {
  return { params: Promise.resolve({ provider }) };
}

describe('GET /auth/login/[provider]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRouteHandlerClient.mockResolvedValue({
      auth: { signInWithOAuth: mockSignInWithOAuth },
    });
  });

  it('redirige (307) para o URL do provider devolvido pelo Supabase', async () => {
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?x=1';
    mockSignInWithOAuth.mockResolvedValue({ data: { url: oauthUrl }, error: null });

    const res = await GET(makeRequest('/auth/login/google?next=%2Fmeus-cursos'), params('google'));

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(oauthUrl);
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${ORIGIN}/auth/callback?next=%2Fmeus-cursos` },
    });
  });

  it('rejeita um provider desconhecido sem chamar o Supabase', async () => {
    const res = await GET(makeRequest('/auth/login/facebook'), params('facebook'));

    expect(res.headers.get('location')).toBe(`${ORIGIN}/?auth_error=unknown_provider`);
    expect(mockSignInWithOAuth).not.toHaveBeenCalled();
  });

  it('descarta um next externo (defesa open-redirect) - callback sem next', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/x' },
      error: null,
    });

    await GET(makeRequest('/auth/login/google?next=https://evil.example'), params('google'));

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: `${ORIGIN}/auth/callback` },
    });
  });

  it('em erro do Supabase, redirige para a home com auth_error', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: null, error: { message: 'boom' } });

    const res = await GET(makeRequest('/auth/login/google'), params('google'));

    expect(res.headers.get('location')).toBe(`${ORIGIN}/?auth_error=oauth_init`);
  });
});
