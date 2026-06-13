import { describe, it, expect, beforeEach, vi } from 'vitest';

import { goLiveAction, endLiveAction } from './actions';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import { findCurrentLiveVideoId } from '@/lib/youtube/live-status';
import { revalidatePath } from 'next/cache';
import type { Profile, Role } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  getServerClient: vi.fn(),
}));
vi.mock('@/lib/youtube/live-status', () => ({
  findCurrentLiveVideoId: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const mockGetCurrentUser = vi.mocked(getCurrentUser);
const mockGetServerClient = vi.mocked(getServerClient);
const mockFindVideoId = vi.mocked(findCurrentLiveVideoId);
const mockRevalidatePath = vi.mocked(revalidatePath);

function asProfile(role: Role): Profile {
  return { role } as unknown as Profile;
}

/** Stub mínimo de `.from('live_override').update({...}).eq('id', 1) → { error }`. */
function stubClient(error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ error });
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));
  return { client: { from } as never, from, update, eq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('goLiveAction', () => {
  it('recusa quando não há sessão (sem tocar na base de dados)', async () => {
    mockGetCurrentUser.mockResolvedValue(null);

    const result = await goLiveAction();

    expect(result.ok).toBe(false);
    expect(mockGetServerClient).not.toHaveBeenCalled();
    expect(mockFindVideoId).not.toHaveBeenCalled();
  });

  it('recusa quando o caller é user comum', async () => {
    mockGetCurrentUser.mockResolvedValue(asProfile('user'));

    const result = await goLiveAction();

    expect(result.ok).toBe(false);
    expect(mockGetServerClient).not.toHaveBeenCalled();
  });

  it('liga e escreve a linha quando o caller é admin', async () => {
    mockGetCurrentUser.mockResolvedValue(asProfile('admin'));
    mockFindVideoId.mockResolvedValue('vid123');
    const { client, from, update, eq } = stubClient();
    mockGetServerClient.mockResolvedValue(client);

    const result = await goLiveAction();

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith('live_override');
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ is_live: true, video_id: 'vid123' }),
    );
    expect(eq).toHaveBeenCalledWith('id', 1);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/live');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/live');
  });

  it('aceita super_admin e armar sem videoId (stream ainda por iniciar)', async () => {
    mockGetCurrentUser.mockResolvedValue(asProfile('super_admin'));
    mockFindVideoId.mockResolvedValue(null);
    const { client, update } = stubClient();
    mockGetServerClient.mockResolvedValue(client);

    const result = await goLiveAction();

    expect(result).toEqual({ ok: true });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_live: true, video_id: null }));
  });

  it('devolve erro quando o update falha (ex.: RLS)', async () => {
    mockGetCurrentUser.mockResolvedValue(asProfile('admin'));
    mockFindVideoId.mockResolvedValue('vid123');
    const { client } = stubClient({ message: 'permission denied' });
    mockGetServerClient.mockResolvedValue(client);

    const result = await goLiveAction();

    expect(result.ok).toBe(false);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('endLiveAction', () => {
  it('recusa quando o caller não é admin', async () => {
    mockGetCurrentUser.mockResolvedValue(asProfile('user'));

    const result = await endLiveAction();

    expect(result.ok).toBe(false);
    expect(mockGetServerClient).not.toHaveBeenCalled();
  });

  it('desliga a linha quando o caller é admin', async () => {
    mockGetCurrentUser.mockResolvedValue(asProfile('admin'));
    const { client, from, update, eq } = stubClient();
    mockGetServerClient.mockResolvedValue(client);

    const result = await endLiveAction();

    expect(result).toEqual({ ok: true });
    expect(from).toHaveBeenCalledWith('live_override');
    expect(update).toHaveBeenCalledWith({ is_live: false, video_id: null, armed_until: null });
    expect(eq).toHaveBeenCalledWith('id', 1);
  });
});
