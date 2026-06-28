import { describe, it, expect } from 'vitest';

import { parseLiveWindows, isWithinLiveWindow } from './live-windows';

describe('parseLiveWindows', () => {
  it('lê várias janelas separadas por ;', () => {
    expect(parseLiveWindows('TUE 20:00-22:00; SUN 10:00-12:30')).toEqual([
      { day: 2, start: 1200, end: 1320 },
      { day: 0, start: 600, end: 750 },
    ]);
  });

  it('aceita dias em minúsculas e espaços extra', () => {
    expect(parseLiveWindows('  tue 20:00 - 21:00 ')).toEqual([{ day: 2, start: 1200, end: 1260 }]);
  });

  it('ignora entradas malformadas sem rebentar', () => {
    expect(parseLiveWindows('XYZ 10:00-11:00; TUE 25:00-26:00; MON 09:00-08:00')).toEqual([]);
  });

  it('devolve lista vazia para spec vazio ou ausente', () => {
    expect(parseLiveWindows('')).toEqual([]);
    expect(parseLiveWindows(undefined)).toEqual([]);
    expect(parseLiveWindows(null)).toEqual([]);
  });
});

describe('isWithinLiveWindow (Europe/Lisbon)', () => {
  const SPEC = 'TUE 20:00-22:00; SUN 10:00-12:30';

  it('está dentro a meio de uma janela à terça (verão, UTC+1)', () => {
    // 2026-06-16 é terça; 19:30Z = 20:30 em Lisboa.
    expect(isWithinLiveWindow(new Date('2026-06-16T19:30:00Z'), SPEC)).toBe(true);
  });

  it('está fora antes do início da janela', () => {
    // 18:30Z = 19:30 em Lisboa, antes das 20:00.
    expect(isWithinLiveWindow(new Date('2026-06-16T18:30:00Z'), SPEC)).toBe(false);
  });

  it('o fim da janela é exclusivo', () => {
    // 21:00Z = 22:00 em Lisboa = fim exato → fora.
    expect(isWithinLiveWindow(new Date('2026-06-16T21:00:00Z'), SPEC)).toBe(false);
  });

  it('está dentro da janela de domingo', () => {
    // 2026-06-14 é domingo; 09:30Z = 10:30 em Lisboa.
    expect(isWithinLiveWindow(new Date('2026-06-14T09:30:00Z'), SPEC)).toBe(true);
  });

  it('está fora num dia sem janela', () => {
    // 2026-06-13 é sábado.
    expect(isWithinLiveWindow(new Date('2026-06-13T19:30:00Z'), SPEC)).toBe(false);
  });

  it('sem janelas configuradas devolve sempre false (fail-safe)', () => {
    expect(isWithinLiveWindow(new Date('2026-06-16T19:30:00Z'), '')).toBe(false);
  });
});
