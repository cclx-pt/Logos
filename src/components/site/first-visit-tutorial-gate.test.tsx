import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser } = vi.hoisted(() => ({ mockGetCurrentUser: vi.fn() }));
vi.mock('@/lib/auth', () => ({ getCurrentUser: mockGetCurrentUser }));

import { FirstVisitTutorialGate } from './first-visit-tutorial-gate';

const profile: Profile = {
  id: '00000000-0000-4000-8000-000000000001',
  externalAuthId: 'ext-1',
  displayName: 'João',
  role: 'user',
  createdAt: '2026-01-01T00:00:00Z',
};

describe('FirstVisitTutorialGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('não renderiza nada para anónimo', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const ui = await FirstVisitTutorialGate();
    expect(ui).toBeNull();
  });

  it('renderiza o convite para utilizador com sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(profile);
    const ui = await FirstVisitTutorialGate();
    if (ui === null) throw new Error('esperava o banner para utilizador autenticado');
    render(ui);
    expect(await screen.findByRole('dialog', { name: /bem-vindo ao logos/i })).toBeInTheDocument();
  });
});
