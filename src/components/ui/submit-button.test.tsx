import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { SubmitButton } from './submit-button';

// useFormStatus precisa de contexto do ReactDOM Form. Mock directo: por
// defeito devolve { pending: false }; cada teste pode sobrepor antes do
// render.
const mockUseFormStatus = vi.hoisted(() => vi.fn(() => ({ pending: false })));

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return { ...actual, useFormStatus: mockUseFormStatus };
});

describe('SubmitButton — estado idle', () => {
  it('renderiza children quando não está pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: false });
    render(<SubmitButton>Adicionar aula</SubmitButton>);
    expect(screen.getByRole('button', { name: /adicionar aula/i })).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('não tem aria-busy quando idle', () => {
    mockUseFormStatus.mockReturnValue({ pending: false });
    render(<SubmitButton>Adicionar aula</SubmitButton>);
    const btn = screen.getByRole('button', { name: /adicionar aula/i });
    expect(btn).not.toHaveAttribute('aria-busy');
    expect(btn).not.toBeDisabled();
  });
});

describe('SubmitButton — estado pending', () => {
  it('substitui children por pendingLabel + Spinner', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<SubmitButton pendingLabel="A enviar PDF…">Adicionar aula</SubmitButton>);
    expect(screen.queryByText('Adicionar aula')).not.toBeInTheDocument();
    // O texto pendingLabel aparece tanto no span visível como no sr-only
    // do Spinner — usar getAllByText para tolerar ambos.
    expect(screen.getAllByText(/a enviar pdf/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('aplica aria-busy="true" e disable quando pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<SubmitButton>Adicionar aula</SubmitButton>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
  });

  it('mostra ProgressBar quando showProgressBar e pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(
      <SubmitButton pendingLabel="A enviar PDF…" showProgressBar>
        Adicionar aula
      </SubmitButton>,
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('NÃO mostra ProgressBar se showProgressBar=false mesmo pending', () => {
    mockUseFormStatus.mockReturnValue({ pending: true });
    render(<SubmitButton>Adicionar aula</SubmitButton>);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
