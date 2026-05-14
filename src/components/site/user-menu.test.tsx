import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import type { Profile } from '@/lib/auth';

vi.mock('@/lib/auth/actions', () => ({
  signOutAction: vi.fn(),
}));

import { UserMenu } from './user-menu';

function makeUser(role: Profile['role']): Profile {
  return {
    id: 'profile-uuid',
    externalAuthId: 'auth-uid',
    displayName: 'João Ribeiro',
    role,
    createdAt: '2026-05-14T00:00:00Z',
  };
}

// Nota: base-ui Menu não monta o conteúdo até abrir, e jsdom não tem todas as
// APIs (ResizeObserver, etc.) para o motor de posicionamento ser bem-sucedido.
// Por isso testamos apenas o trigger (o que conseguimos observar de forma
// determinística); a lógica de role aparece no admin layout que tem testes
// próprios, e o fluxo completo é validado em E2E manual (ver v2-auth.md §3).
describe('UserMenu (V2 PR3) — trigger', () => {
  it('mostra primeiro nome do utilizador no trigger', () => {
    render(<UserMenu user={makeUser('user')} />);
    expect(screen.getByText(/olá, joão/i)).toBeInTheDocument();
  });

  it('expõe trigger acessível com aria-label completo', () => {
    render(<UserMenu user={makeUser('admin')} />);
    expect(
      screen.getByRole('button', { name: /menu do utilizador joão ribeiro/i }),
    ).toBeInTheDocument();
  });
});
