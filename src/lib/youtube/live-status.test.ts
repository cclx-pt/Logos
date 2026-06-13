import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { getLiveStatus, parseSearchResponse, parseVideoLiveState } from './live-status';

const ALL_DAY =
  'SUN 00:00-23:59; MON 00:00-23:59; TUE 00:00-23:59; WED 00:00-23:59; THU 00:00-23:59; FRI 00:00-23:59; SAT 00:00-23:59';

// 2026-06-16 12:00Z é terça e cai em qualquer janela "all day".
const NOW = new Date('2026-06-16T12:00:00Z');

function mockFetch(impl: (input: URL | RequestInfo) => Promise<unknown>) {
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

describe('parseVideoLiveState', () => {
  it('true quando o vídeo continua em direto', () => {
    expect(
      parseVideoLiveState({
        items: [{ snippet: { liveBroadcastContent: 'live' }, liveStreamingDetails: {} }],
      }),
    ).toBe(true);
  });

  it('false quando a emissão já terminou (actualEndTime)', () => {
    expect(
      parseVideoLiveState({
        items: [
          {
            snippet: { liveBroadcastContent: 'live' },
            liveStreamingDetails: { actualEndTime: '2026-06-16T13:00:00Z' },
          },
        ],
      }),
    ).toBe(false);
  });

  it('false quando o broadcast já não é live', () => {
    expect(
      parseVideoLiveState({
        items: [{ snippet: { liveBroadcastContent: 'none' }, liveStreamingDetails: {} }],
      }),
    ).toBe(false);
  });

  it('false quando o vídeo foi removido (sem itens)', () => {
    expect(parseVideoLiveState({ items: [] })).toBe(false);
  });

  it('null quando a forma é indeterminada', () => {
    expect(parseVideoLiveState(null)).toBeNull();
    expect(parseVideoLiveState({})).toBeNull();
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
    const fetchFn = mockFetch(async (input) => {
      if (String(input).includes('/search')) {
        return {
          ok: true,
          json: async () => ({
            items: [{ id: { videoId: 'live9' }, snippet: { title: 'Ao vivo' } }],
          }),
        };
      }
      // videos.list: confirma que continua em direto.
      return {
        ok: true,
        json: async () => ({
          items: [{ snippet: { liveBroadcastContent: 'live' }, liveStreamingDetails: {} }],
        }),
      };
    });
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(true);
    expect(status.videoId).toBe('live9');
    expect(fetchFn).toHaveBeenCalledTimes(2);
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

  it('offline confirmado quando o search lista mas a emissão já terminou', async () => {
    const fetchFn = mockFetch(async (input) => {
      if (String(input).includes('/search')) {
        return {
          ok: true,
          json: async () => ({
            items: [{ id: { videoId: 'ended1' }, snippet: { title: 'Acabou' } }],
          }),
        };
      }
      return {
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: { liveBroadcastContent: 'none' },
              liveStreamingDetails: { actualEndTime: '2026-06-16T11:30:00Z' },
            },
          ],
        }),
      };
    });
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(false);
    expect(status.stale).toBeUndefined();
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('mantém live (stale) quando a verificação falha', async () => {
    mockFetch(async (input) => {
      if (String(input).includes('/search')) {
        return {
          ok: true,
          json: async () => ({
            items: [{ id: { videoId: 'live9' }, snippet: { title: 'Ao vivo' } }],
          }),
        };
      }
      return { ok: false, json: async () => ({}) };
    });
    const status = await getLiveStatus(NOW);
    expect(status.live).toBe(true);
    expect(status.videoId).toBe('live9');
    expect(status.stale).toBe(true);
  });
});
