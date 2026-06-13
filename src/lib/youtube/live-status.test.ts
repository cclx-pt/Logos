import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { getLiveStatus, parseSearchResponse } from './live-status';

const ALL_DAY =
  'SUN 00:00-23:59; MON 00:00-23:59; TUE 00:00-23:59; WED 00:00-23:59; THU 00:00-23:59; FRI 00:00-23:59; SAT 00:00-23:59';

// 2026-06-16 12:00Z é terça e cai em qualquer janela "all day".
const NOW = new Date('2026-06-16T12:00:00Z');

function mockFetch(impl: () => Promise<unknown>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

describe('parseSearchResponse', () => {
  it('marca live quando há um item com videoId', () => {
    const status = parseSearchResponse({
      items: [{ id: { videoId: 'abc123' }, snippet: { title: 'Estudo' } }],
    });
    expect(status.live).toBe(true);
    expect(status.videoId).toBe('abc123');
    expect(status.title).toBe('Estudo');
  });

  it('offline (sem stale) quando não há itens', () => {
    const status = parseSearchResponse({ items: [] });
    expect(status.live).toBe(false);
    expect(status.videoId).toBeNull();
    expect(status.stale).toBeUndefined();
  });

  it('offline quando a forma é inesperada', () => {
    expect(parseSearchResponse(null).live).toBe(false);
    expect(parseSearchResponse({ items: [{ id: {} }] }).live).toBe(false);
    expect(parseSearchResponse({ items: [{ id: { videoId: '' } }] }).live).toBe(false);
  });
});

describe('getLiveStatus', () => {
  beforeEach(() => {
    process.env.YOUTUBE_API_KEY = 'test-key';
    process.env.YOUTUBE_LIVE_WINDOWS = ALL_DAY;
    process.env.YOUTUBE_CHANNEL_ID = 'UC_test';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.YOUTUBE_API_KEY;
    delete process.env.YOUTUBE_LIVE_WINDOWS;
    delete process.env.YOUTUBE_CHANNEL_ID;
  });

  it('devolve live quando a API confirma transmissão', async () => {
    const fetchFn = mockFetch(async () => ({
      ok: true,
      json: async () => ({ items: [{ id: { videoId: 'live9' }, snippet: { title: 'Ao vivo' } }] }),
    }));
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(true);
    expect(status.videoId).toBe('live9');
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('devolve offline quando a API não tem itens', async () => {
    mockFetch(async () => ({ ok: true, json: async () => ({ items: [] }) }));
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(false);
    expect(status.stale).toBeUndefined();
  });

  it('fail-safe (stale) quando a API responde com erro', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(false);
    expect(status.stale).toBe(true);
  });

  it('fail-safe (stale) quando o fetch rebenta', async () => {
    mockFetch(async () => {
      throw new Error('network');
    });
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(false);
    expect(status.stale).toBe(true);
  });

  it('não chama a API fora das janelas configuradas', async () => {
    process.env.YOUTUBE_LIVE_WINDOWS = 'MON 03:00-04:00';
    const fetchFn = mockFetch(async () => ({ ok: true, json: async () => ({ items: [] }) }));
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(false);
    expect(status.stale).toBeUndefined();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('fail-safe (stale) e sem chamada quando falta a API key', async () => {
    delete process.env.YOUTUBE_API_KEY;
    const fetchFn = mockFetch(async () => ({ ok: true, json: async () => ({ items: [] }) }));
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(false);
    expect(status.stale).toBe(true);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
