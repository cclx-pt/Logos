import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockNotFound } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockNotFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
}));

vi.mock('next/navigation', () => ({
  notFound: mockNotFound,
}));

import AdminLayout from './layout';

function makeUser(role: Profile['role']): Profile {
  return {
    id: 'profile-uuid',
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role,
    createdAt: '2026-05-14T00:00:00Z',
  };
}

describe('AdminLayout (V2 PR3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });
  });

  it('chama notFound() quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    await expect(AdminLayout({ children: <div /> })).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('chama notFound() quando role=user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser('user'));
    await expect(AdminLayout({ children: <div /> })).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('renderiza filhos quando role=admin (sem links Utilizadores/Etiquetas)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser('admin'));
    const ui = await AdminLayout({
      children: <div data-testid="children">Conteúdo</div>,
    });
    render(ui);
    expect(screen.getByTestId('children')).toHaveTextContent('Conteúdo');
    expect(screen.getByRole('link', { name: /painel/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /utilizadores/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /etiquetas/i })).not.toBeInTheDocument();
  });

  it('renderiza filhos + links Utilizadores/Etiquetas quando role=super_admin', async () => {
    mockGetCurrentUser.mockResolvedValue(makeUser('super_admin'));
    const ui = await AdminLayout({
      children: <div data-testid="children">Conteúdo</div>,
    });
    render(ui);
    expect(screen.getByTestId('children')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /utilizadores/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /etiquetas/i })).toBeInTheDocument();
  });
});
