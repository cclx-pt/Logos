import { describe, it, expect } from 'vitest';

import { isAllowedHost, originFromHeaders } from './origin';

describe('isAllowedHost', () => {
  it('aceita produção, localhost e previews Vercel', () => {
    expect(isAllowedHost('logos.cclx.pt')).toBe(true);
    expect(isAllowedHost('localhost:3000')).toBe(true);
    expect(isAllowedHost('127.0.0.1')).toBe(true);
    expect(isAllowedHost('logos-git-x-jcrninjas-projects.vercel.app')).toBe(true);
  });

  it('rejeita hosts externos', () => {
    expect(isAllowedHost('evil.example')).toBe(false);
    expect(isAllowedHost('logos.cclx.pt.evil.com')).toBe(false);
    expect(isAllowedHost('notvercel.app.evil.com')).toBe(false);
  });
});

describe('originFromHeaders', () => {
  it('prefere o header origin quando presente', () => {
    const h = new Headers({ origin: 'https://logos.cclx.pt' });
    expect(originFromHeaders(h)).toBe('https://logos.cclx.pt');
  });

  it('cai para x-forwarded-host/proto quando não há origin', () => {
    const h = new Headers({
      'x-forwarded-host': 'logos-git-x-jcrninjas-projects.vercel.app',
      'x-forwarded-proto': 'https',
    });
    expect(originFromHeaders(h)).toBe('https://logos-git-x-jcrninjas-projects.vercel.app');
  });

  it('lança se o host não estiver no allowlist (host-header injection)', () => {
    const h = new Headers({ origin: 'https://evil.example' });
    expect(() => originFromHeaders(h)).toThrow(/não permitido/i);
  });

  it('lança se não houver host nenhum', () => {
    expect(() => originFromHeaders(new Headers())).toThrow(/host header em falta/i);
  });
});
