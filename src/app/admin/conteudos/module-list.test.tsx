import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMoveUp, mockMoveDown } = vi.hoisted(() => ({
  mockMoveUp: vi.fn(),
  mockMoveDown: vi.fn(),
}));

vi.mock('./modules-actions', () => ({
  moveModuleUpAction: mockMoveUp,
  moveModuleDownAction: mockMoveDown,
}));

import { ModuleList, type ModuleListItem } from './module-list';

const COURSE_ID = 'c1';

function makeModules(): ModuleListItem[] {
  return [
    { id: 'm-a', title: 'Módulo A', description: 'desc A', position: 0 },
    { id: 'm-b', title: 'Módulo B', description: null, position: 1 },
    { id: 'm-c', title: 'Módulo C', description: 'desc C', position: 2 },
  ];
}

describe('ModuleList — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMoveUp.mockResolvedValue({ ok: true });
    mockMoveDown.mockResolvedValue({ ok: true });
  });

  it('mostra placeholder quando lista vazia', () => {
    render(<ModuleList initial={[]} courseId={COURSE_ID} />);
    expect(screen.getByText(/ainda não há módulos/i)).toBeInTheDocument();
  });

  it('renderiza um item por módulo com numeração 1-based', () => {
    render(<ModuleList initial={makeModules()} courseId={COURSE_ID} />);
    expect(screen.getByText('Módulo A')).toBeInTheDocument();
    expect(screen.getByText('Módulo B')).toBeInTheDocument();
    expect(screen.getByText('Módulo C')).toBeInTheDocument();
    expect(screen.getByText('1.')).toBeInTheDocument();
    expect(screen.getByText('2.')).toBeInTheDocument();
    expect(screen.getByText('3.')).toBeInTheDocument();
  });

  it('substitui o item editingId pelo editingNode pré-renderizado', () => {
    render(
      <ModuleList
        initial={makeModules()}
        courseId={COURSE_ID}
        editingId="m-b"
        editingNode={<form data-testid="edit-form">edit Módulo B</form>}
      />,
    );
    expect(screen.getByTestId('edit-form')).toBeInTheDocument();
  });

  it('substitui o item deletingId pelo deletingNode pré-renderizado', () => {
    render(
      <ModuleList
        initial={makeModules()}
        courseId={COURSE_ID}
        deletingId="m-c"
        deletingNode={<div data-testid="delete-confirm">apagar?</div>}
      />,
    );
    expect(screen.getByTestId('delete-confirm')).toBeInTheDocument();
  });
});

describe('ModuleList — optimistic reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMoveUp.mockResolvedValue({ ok: true });
    mockMoveDown.mockResolvedValue({ ok: true });
  });

  it('clicar ↑ no primeiro módulo é no-op (disabled)', async () => {
    const user = userEvent.setup();
    render(<ModuleList initial={makeModules()} courseId={COURSE_ID} />);
    const upA = screen.getByRole('button', { name: /mover módulo a para cima/i });
    expect(upA).toBeDisabled();
    await user.click(upA);
    expect(mockMoveUp).not.toHaveBeenCalled();
  });

  it('clicar ↓ no último módulo é no-op (disabled)', async () => {
    const user = userEvent.setup();
    render(<ModuleList initial={makeModules()} courseId={COURSE_ID} />);
    const downC = screen.getByRole('button', { name: /mover módulo c para baixo/i });
    expect(downC).toBeDisabled();
    await user.click(downC);
    expect(mockMoveDown).not.toHaveBeenCalled();
  });

  it('clicar ↑ no módulo B chama moveModuleUpAction com FormData', async () => {
    const user = userEvent.setup();
    render(<ModuleList initial={makeModules()} courseId={COURSE_ID} />);
    const upB = screen.getByRole('button', { name: /mover módulo b para cima/i });
    await act(async () => {
      await user.click(upB);
    });
    expect(mockMoveUp).toHaveBeenCalledTimes(1);
    const fd = mockMoveUp.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('m-b');
    expect(fd.get('course_id')).toBe(COURSE_ID);
  });

  it('clicar ↓ no módulo B chama moveModuleDownAction', async () => {
    const user = userEvent.setup();
    render(<ModuleList initial={makeModules()} courseId={COURSE_ID} />);
    const downB = screen.getByRole('button', { name: /mover módulo b para baixo/i });
    await act(async () => {
      await user.click(downB);
    });
    expect(mockMoveDown).toHaveBeenCalledTimes(1);
    const fd = mockMoveDown.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('m-b');
  });
});
