import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { FalaConnoscoContent } from './fala-connosco-content';

describe('FalaConnoscoContent', () => {
  it('apresenta heading principal', () => {
    render(<FalaConnoscoContent />);
    expect(screen.getByRole('heading', { level: 1, name: /fala connosco/i })).toBeInTheDocument();
  });

  it('expõe mailto para logos@cclx.pt com subject preenchido', () => {
    render(<FalaConnoscoContent />);
    const emailLink = screen.getByRole('link', { name: /email/i });
    expect(emailLink).toHaveAttribute('href', 'mailto:logos@cclx.pt?subject=Contacto%20Logos');
  });

  it('link para o site da CCLX abre em nova aba com rel seguro', () => {
    render(<FalaConnoscoContent />);
    const churchLink = screen.getByRole('link', { name: /site da igreja/i });
    expect(churchLink).toHaveAttribute('href', 'https://cclx.pt');
    expect(churchLink).toHaveAttribute('target', '_blank');
    expect(churchLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
