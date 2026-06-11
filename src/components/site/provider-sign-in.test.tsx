import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  signInWithGoogleAction: vi.fn(),
}));

import { signInWithGoogleAction } from '@/lib/auth/actions';
import { ProviderSignIn } from './provider-sign-in';

describe('ProviderSignIn', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza um botão por provider (só Google)', () => {
    render(<ProviderSignIn />);
    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /continuar com microsoft/i }),
    ).not.toBeInTheDocument();
  });

  it('propaga o next via data-next quando fornecido', () => {
    render(<ProviderSignIn next="/conteudos/abc" />);
    const google = screen.getByRole('button', { name: /continuar com google/i });
    expect(google).toHaveAttribute('data-next', '/conteudos/abc');
  });

  it('omite o data-next quando não fornecido', () => {
    render(<ProviderSignIn />);
    const google = screen.getByRole('button', { name: /continuar com google/i });
    expect(google).not.toHaveAttribute('data-next');
  });

  it('ao clicar, chama a action com o next e navega para o URL devolvido', async () => {
    // Regressão do "This page couldn't load" (500): o login passa a navegar no
    // cliente com o URL devolvido, em vez de redirect() server-side externo.
    const oauthUrl = 'https://accounts.google.com/o/oauth2/v2/auth?x=1';
    (signInWithGoogleAction as Mock).mockResolvedValue(oauthUrl);
    const assign = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { assign },
    });

    const user = userEvent.setup();
    render(<ProviderSignIn next="/meus-cursos" />);
    await user.click(screen.getByRole('button', { name: /continuar com google/i }));

    expect(signInWithGoogleAction).toHaveBeenCalledWith('/meus-cursos');
    expect(assign).toHaveBeenCalledWith(oauthUrl);
  });
});
