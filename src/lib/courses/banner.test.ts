import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCreateSignedUrls } = vi.hoisted(() => ({
  mockCreateSignedUrls: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  getServerClient: vi.fn(async () => ({
    storage: {
      from: vi.fn(() => ({
        createSignedUrls: mockCreateSignedUrls,
      })),
    },
  })),
}));

import { getBannerUrlsByPath, getBannerUrlForPath } from './banner';

describe('getBannerUrlsByPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve Map vazio quando paths é []', async () => {
    const result = await getBannerUrlsByPath([]);
    expect(result.size).toBe(0);
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });

  it('mapeia path → signedUrl quando o Supabase devolve sucesso', async () => {
    mockCreateSignedUrls.mockResolvedValue({
      data: [
        { path: 'c1/banner', signedUrl: 'https://cdn/c1.jpg' },
        { path: 'c2/banner', signedUrl: 'https://cdn/c2.jpg' },
      ],
      error: null,
    });
    const result = await getBannerUrlsByPath(['c1/banner', 'c2/banner']);
    expect(result.get('c1/banner')).toBe('https://cdn/c1.jpg');
    expect(result.get('c2/banner')).toBe('https://cdn/c2.jpg');
  });

  it('devolve Map vazio quando Supabase responde com erro', async () => {
    mockCreateSignedUrls.mockResolvedValue({
      data: null,
      error: { message: 'rate limit' },
    });
    const result = await getBannerUrlsByPath(['c1/banner']);
    expect(result.size).toBe(0);
  });

  it('omite items sem path ou signedUrl', async () => {
    mockCreateSignedUrls.mockResolvedValue({
      data: [
        { path: 'c1/banner', signedUrl: 'https://cdn/c1.jpg' },
        { path: 'c2/banner', signedUrl: null },
        { path: null, signedUrl: 'https://cdn/orphan.jpg' },
      ],
      error: null,
    });
    const result = await getBannerUrlsByPath(['c1/banner', 'c2/banner']);
    expect(result.size).toBe(1);
    expect(result.get('c1/banner')).toBe('https://cdn/c1.jpg');
  });
});

describe('getBannerUrlForPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devolve null quando path é null', async () => {
    const result = await getBannerUrlForPath(null);
    expect(result).toBeNull();
    expect(mockCreateSignedUrls).not.toHaveBeenCalled();
  });

  it('devolve a signed URL para um path válido', async () => {
    mockCreateSignedUrls.mockResolvedValue({
      data: [{ path: 'c1/banner', signedUrl: 'https://cdn/c1.jpg' }],
      error: null,
    });
    const result = await getBannerUrlForPath('c1/banner');
    expect(result).toBe('https://cdn/c1.jpg');
  });

  it('devolve null quando o signing falha', async () => {
    mockCreateSignedUrls.mockResolvedValue({
      data: null,
      error: { message: 'boom' },
    });
    const result = await getBannerUrlForPath('c1/banner');
    expect(result).toBeNull();
  });
});
