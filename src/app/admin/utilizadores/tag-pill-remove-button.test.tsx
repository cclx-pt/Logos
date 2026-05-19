import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { TagPillRemoveButton } from './tag-pill-remove-button';

const mockUseFormStatus = vi.hoisted(() => vi.fn(() => ({ pending: false })));

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return { ...actual, useFormStatus: mockUseFormStatus };
});

describe('TagPillRemoveButton', () => {
  it('renderiza label + × quando idle', () => {
    mockUseFormStatus.mockReturnValue({ pending: false });
    render(<TagPillRemoveButton label="Mentoria" ariaLabel="Remover etiqueta Mentoria de João" />);
    const btn = screen.getByRole('button', { name: /remover etiqueta mentoria de joão/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
    expect(btn).not.toHaveAttribute('aria-busy');
    expect(btn.textContent).toMatch(/mentoria/i);
    expect(btn.textContent).toMatch(/×/);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('substitui × por Spinner + disable quando pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<TagPillRemoveButton label="Mentoria" ariaLabel="Remover etiqueta Mentoria de João" />);
    const btn = screen.getByRole('button', { name: /remover etiqueta mentoria de joão/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn.textContent).not.toMatch(/×/);
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/a remover etiqueta mentoria/i)).toBeInTheDocument();
  });
});
