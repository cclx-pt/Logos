import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExchangeCodeForSession = vi.fn();

vi.mock('@/lib/auth', () => ({
  getRouteHandlerClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  })),
}));

import { GET } from './route';

function makeRequest(path: string): Request {
  return new Request(`http://localhost:3000${path}`);
}

describe('GET /auth/callback (V2 PR2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirecciona para / quando exchange tem sucesso', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(makeRequest('/auth/callback?code=abc'));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc');
  });

  it('redirecciona para ?next quando é caminho relativo válido', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(makeRequest('/auth/callback?code=abc&next=/cursos'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/cursos');
  });

  it('rejeita ?next absoluto (URL externa) e cai em /', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(makeRequest('/auth/callback?code=abc&next=https://evil.example.com'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('rejeita ?next protocol-relative //evil.example.com e cai em /', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null });
    const res = await GET(makeRequest('/auth/callback?code=abc&next=//evil.example.com'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/');
  });

  it('redirecciona com auth_error=missing_code quando code está em falta', async () => {
    const res = await GET(makeRequest('/auth/callback'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/?auth_error=missing_code');
    expect(mockExchangeCodeForSession).not.toHaveBeenCalled();
  });

  it('redirecciona com auth_error=exchange_failed quando exchange devolve erro', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid_grant' } });
    const res = await GET(makeRequest('/auth/callback?code=bad'));
    expect(res.headers.get('location')).toBe('http://localhost:3000/?auth_error=exchange_failed');
  });
});
