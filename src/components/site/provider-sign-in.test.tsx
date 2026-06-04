import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/auth/actions', () => ({
  signInWithGoogleAction: vi.fn(),
  signInWithMicrosoftAction: vi.fn(),
}));

import { ProviderSignIn } from './provider-sign-in';

describe('ProviderSignIn', () => {
  it('renderiza um botão por provider (Google + Microsoft)', () => {
    render(<ProviderSignIn />);
    expect(screen.getByRole('button', { name: /continuar com google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continuar com microsoft/i })).toBeInTheDocument();
  });

  it('inclui o hidden next quando fornecido', () => {
    render(<ProviderSignIn next="/conteudos/abc" />);
    const form = screen.getByRole('button', { name: /continuar com google/i }).closest('form');
    const hidden = form?.querySelector('input[name="next"]');
    expect(hidden).toHaveAttribute('type', 'hidden');
    expect(hidden).toHaveAttribute('value', '/conteudos/abc');
  });

  it('omite o hidden next quando não fornecido', () => {
    render(<ProviderSignIn />);
    const form = screen.getByRole('button', { name: /continuar com google/i }).closest('form');
    expect(form?.querySelector('input[name="next"]')).toBeNull();
  });
});
