import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { ProviderSignIn } from './provider-sign-in';

describe('ProviderSignIn', () => {
  it('renderiza um link por provider (só Google)', () => {
    render(<ProviderSignIn />);
    expect(screen.getByRole('link', { name: /continuar com google/i })).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /continuar com microsoft/i }),
    ).not.toBeInTheDocument();
  });

  it('aponta para o route handler de login, com o next no href', () => {
    // O início do OAuth é um route handler (307 real), não uma Server Action -
    // ver nota em provider-sign-in.tsx. Regressão do "This page couldn't load".
    render(<ProviderSignIn next="/conteudos/abc" />);
    const google = screen.getByRole('link', { name: /continuar com google/i });
    expect(google).toHaveAttribute('href', '/auth/login/google?next=%2Fconteudos%2Fabc');
    expect(google).toHaveAttribute('data-next', '/conteudos/abc');
  });

  it('sem next, aponta para o route handler sem query', () => {
    render(<ProviderSignIn />);
    const google = screen.getByRole('link', { name: /continuar com google/i });
    expect(google).toHaveAttribute('href', '/auth/login/google');
    expect(google).not.toHaveAttribute('data-next');
  });
});
