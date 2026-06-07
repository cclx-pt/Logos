import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSignInWithOtp, mockVerifyOtp, mockRedirect, mockHeaders } = vi.hoisted(() => ({
  mockSignInWithOtp: vi.fn(),
  mockVerifyOtp: vi.fn(),
  mockRedirect: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock('./index', () => ({
  getServerClient: vi.fn(async () => ({
    auth: {
      signInWithOtp: mockSignInWithOtp,
      verifyOtp: mockVerifyOtp,
    },
  })),
}));

vi.mock('next/navigation', () => ({
  redirect: mockRedirect,
}));

vi.mock('next/headers', () => ({
  headers: mockHeaders,
}));

import { sendEmailOtpAction, verifyEmailOtpAction } from './actions';

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

describe('sendEmailOtpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignInWithOtp.mockResolvedValue({ error: null });
  });

  it('recusa email inválido sem chamar o Supabase', async () => {
    const result = await sendEmailOtpAction({ status: 'idle' }, fd({ email: 'nope' }));
    expect(result).toEqual({ status: 'error', message: expect.stringMatching(/válido/i) });
    expect(mockSignInWithOtp).not.toHaveBeenCalled();
  });

  it('envia e devolve estado "sent" com o email normalizado', async () => {
    const result = await sendEmailOtpAction(
      { status: 'idle' },
      fd({ email: '  Joao@Exemplo.PT ' }),
    );
    expect(result).toEqual({ status: 'sent', email: 'joao@exemplo.pt' });
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'joao@exemplo.pt',
      options: { shouldCreateUser: true },
    });
  });

  it('inclui o captchaToken quando presente', async () => {
    await sendEmailOtpAction({ status: 'idle' }, fd({ email: 'a@b.pt', captchaToken: 'tok123' }));
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.pt',
      options: { shouldCreateUser: true, captchaToken: 'tok123' },
    });
  });

  it('devolve mensagem genérica quando o Supabase falha (anti-enumeration)', async () => {
    mockSignInWithOtp.mockResolvedValue({ error: { message: 'rate limited' } });
    const result = await sendEmailOtpAction({ status: 'idle' }, fd({ email: 'a@b.pt' }));
    expect(result).toEqual({
      status: 'error',
      message: expect.stringMatching(/não foi possível/i),
    });
  });
});

describe('verifyEmailOtpAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyOtp.mockResolvedValue({ error: null });
  });

  it('recusa código que não tem 6 dígitos', async () => {
    const result = await verifyEmailOtpAction(
      { status: 'idle' },
      fd({ email: 'a@b.pt', token: '12' }),
    );
    expect(result).toEqual({ status: 'error', message: expect.stringMatching(/6 dígitos/i) });
    expect(mockVerifyOtp).not.toHaveBeenCalled();
  });

  it('verifica e redireciona para o next validado em sucesso', async () => {
    await verifyEmailOtpAction(
      { status: 'idle' },
      fd({ email: 'a@b.pt', token: '123456', next: '/conteudos/abc' }),
    );
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'a@b.pt',
      token: '123456',
      type: 'email',
    });
    expect(mockRedirect).toHaveBeenCalledWith('/conteudos/abc');
  });

  it('redireciona para "/" quando não há next', async () => {
    await verifyEmailOtpAction({ status: 'idle' }, fd({ email: 'a@b.pt', token: '123456' }));
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('ignora next externo (open-redirect) e cai em "/"', async () => {
    await verifyEmailOtpAction(
      { status: 'idle' },
      fd({ email: 'a@b.pt', token: '123456', next: 'https://evil.com' }),
    );
    expect(mockRedirect).toHaveBeenCalledWith('/');
  });

  it('devolve erro e não redireciona quando o código é inválido', async () => {
    mockVerifyOtp.mockResolvedValue({ error: { message: 'invalid' } });
    const result = await verifyEmailOtpAction(
      { status: 'idle' },
      fd({ email: 'a@b.pt', token: '999999' }),
    );
    expect(result).toEqual({
      status: 'error',
      message: expect.stringMatching(/inválido|expirado/i),
    });
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
