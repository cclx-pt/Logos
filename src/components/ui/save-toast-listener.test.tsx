import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockReplace, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

let currentSearch = '';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(currentSearch),
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/admin/conteudos',
}));

vi.mock('sonner', () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

import { SaveToastListener } from './save-toast-listener';

describe('SaveToastListener', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentSearch = '';
  });

  it('dispara toast.success com a mensagem mapeada para ?guardado=curso_criado', () => {
    currentSearch = 'guardado=curso_criado';
    render(<SaveToastListener />);
    expect(mockToastSuccess).toHaveBeenCalledWith('Curso criado.');
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it('dispara toast.error para ?erro=generico', () => {
    currentSearch = 'erro=generico';
    render(<SaveToastListener />);
    expect(mockToastError).toHaveBeenCalledWith('Algo correu mal. Tenta de novo.');
    expect(mockToastSuccess).not.toHaveBeenCalled();
  });

  it('limpa o param do URL via router.replace depois de disparar toast', () => {
    currentSearch = 'guardado=modulo_atualizado&outro=valor';
    render(<SaveToastListener />);
    expect(mockReplace).toHaveBeenCalledWith('/admin/conteudos?outro=valor', { scroll: false });
  });

  it('ignora ?guardado=desconhecido sem disparar toast nem mexer no URL', () => {
    currentSearch = 'guardado=desconhecido_qualquer';
    render(<SaveToastListener />);
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('não faz nada sem params relevantes', () => {
    currentSearch = 'foo=bar';
    render(<SaveToastListener />);
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
