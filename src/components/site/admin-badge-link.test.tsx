import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { AdminBadgeLink } from './admin-badge-link';

describe('AdminBadgeLink', () => {
  it('renderiza link para /admin com texto "Área admin"', () => {
    render(<AdminBadgeLink />);
    const link = screen.getByRole('link', { name: /área admin/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/admin');
  });

  it('aplica background sage (token bg-sage-card)', () => {
    render(<AdminBadgeLink />);
    const link = screen.getByRole('link', { name: /área admin/i });
    expect(link.className).toContain('bg-sage-card');
  });

  it('aplica className adicional quando passado por prop', () => {
    render(<AdminBadgeLink className="hidden md:inline-flex" />);
    const link = screen.getByRole('link', { name: /área admin/i });
    expect(link.className).toContain('hidden');
    expect(link.className).toContain('md:inline-flex');
  });
});
