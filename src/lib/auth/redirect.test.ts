import { describe, it, expect } from 'vitest';
import { safeNextPath } from './redirect';

const BS = String.fromCharCode(0x5c); // backslash
const TAB = String.fromCharCode(0x09);
const CR = String.fromCharCode(0x0d);
const LF = String.fromCharCode(0x0a);
const ORIGIN = 'https://logos.cclx.pt';

describe('safeNextPath', () => {
  it('aceita caminhos relativos internos legítimos', () => {
    expect(safeNextPath('/conteudos')).toBe('/conteudos');
    expect(safeNextPath('/perfil')).toBe('/perfil');
    expect(safeNextPath('/conteudos?q=joao')).toBe('/conteudos?q=joao');
  });

  it('rejeita não-strings, vazio e ausência', () => {
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
    expect(safeNextPath('')).toBeNull();
    expect(safeNextPath(42)).toBeNull();
    expect(safeNextPath(new File([], 'x'))).toBeNull();
  });

  it('rejeita URLs absolutas e protocol-relative', () => {
    expect(safeNextPath('https://evil.com')).toBeNull();
    expect(safeNextPath('//evil.com')).toBeNull();
    expect(safeNextPath('http://evil.com')).toBeNull();
  });

  it('rejeita o bypass por backslash (o parser de URL trata \\ como /)', () => {
    expect(safeNextPath('/' + BS + 'evil.com')).toBeNull();
    expect(safeNextPath('/' + BS + '/evil.com')).toBeNull();
    expect(safeNextPath(BS + BS + 'evil.com')).toBeNull();
  });

  it('rejeita o bypass por caracteres de controlo (tab/CR/LF)', () => {
    expect(safeNextPath('/' + TAB + '/evil.com')).toBeNull();
    expect(safeNextPath('/x' + CR + LF + 'Set-Cookie: a=b')).toBeNull();
  });

  it('rejeita caminhos demasiado longos', () => {
    expect(safeNextPath('/' + 'a'.repeat(600))).toBeNull();
  });

  // Garantia central: o que passa nunca escapa do origin quando resolvido.
  it('tudo o que passa resolve para o mesmo origin', () => {
    const candidates = [
      '/conteudos',
      '/' + BS + 'evil.com',
      '/' + BS + '/evil.com',
      '/' + TAB + '/evil.com',
      '//evil.com',
      'https://evil.com',
    ];
    for (const c of candidates) {
      const safe = safeNextPath(c);
      if (safe !== null) {
        expect(new URL(safe, ORIGIN).origin).toBe(ORIGIN);
      }
    }
  });
});
