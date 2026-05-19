import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDelete, mockUpdate } = vi.hoisted(() => ({
  mockDelete: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('./actions', () => ({
  deleteTagAction: mockDelete,
  updateTagAction: mockUpdate,
}));

import { TagsTable, type TagListItem } from './tags-table';

function makeTags(): TagListItem[] {
  return [
    { id: 't-a', label: 'Aluno', created_at: '2026-05-18T10:00:00Z' },
    { id: 't-m', label: 'Mentoria', created_at: '2026-05-19T10:00:00Z' },
    { id: 't-v', label: 'Voluntariado', created_at: '2026-05-20T10:00:00Z' },
  ];
}

describe('TagsTable — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue({ ok: true });
    mockUpdate.mockResolvedValue({ ok: true });
  });

  it('mostra placeholder quando lista vazia', () => {
    render(<TagsTable initial={[]} />);
    expect(screen.getByText(/ainda não há etiquetas/i)).toBeInTheDocument();
  });

  it('renderiza uma linha por etiqueta', () => {
    render(<TagsTable initial={makeTags()} />);
    expect(screen.getByText('Aluno')).toBeInTheDocument();
    expect(screen.getByText('Mentoria')).toBeInTheDocument();
    expect(screen.getByText('Voluntariado')).toBeInTheDocument();
  });

  it('com editingId, renderiza form inline em vez da linha normal', () => {
    render(<TagsTable initial={makeTags()} editingId="t-m" />);
    expect(screen.getByRole('textbox', { name: /nome/i })).toHaveValue('Mentoria');
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument();
  });

  it('com confirmingDeleteId, renderiza confirm inline em vez da linha normal', () => {
    render(<TagsTable initial={makeTags()} confirmingDeleteId="t-v" />);
    expect(screen.getByText(/apagar a etiqueta/i)).toBeInTheDocument();
    expect(screen.getByText(/voluntariado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /apagar definitivamente/i })).toBeInTheDocument();
  });
});

describe('TagsTable — optimistic delete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDelete.mockResolvedValue({ ok: true });
  });

  it('clicar "Apagar definitivamente" remove a linha imediatamente (optimistic) e chama deleteTagAction', async () => {
    // useOptimistic reverte assim que a action resolve. Para observar o
    // estado optimistic, prendemos o mock numa promise pending — assim a
    // transition não fecha durante a assertion.
    mockDelete.mockReturnValue(new Promise(() => {}));

    const user = userEvent.setup();
    render(<TagsTable initial={makeTags()} confirmingDeleteId="t-m" />);

    expect(screen.getByText(/^mentoria$/i)).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: /apagar definitivamente/i });
    await act(async () => {
      await user.click(btn);
    });

    expect(mockDelete).toHaveBeenCalledTimes(1);
    const fd = mockDelete.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('t-m');
    expect(screen.queryByText(/^mentoria$/i)).not.toBeInTheDocument();
  });
});
