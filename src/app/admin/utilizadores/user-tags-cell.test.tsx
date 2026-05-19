import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockAssign, mockUnassign } = vi.hoisted(() => ({
  mockAssign: vi.fn(),
  mockUnassign: vi.fn(),
}));

vi.mock('./actions', () => ({
  assignTagAction: mockAssign,
  unassignTagAction: mockUnassign,
}));

import { UserTagsCell } from './user-tags-cell';

const USER_ID = 'u1';
const USER_NAME = 'João';
const TAG_A = { id: 't-a', label: 'Aluno' };
const TAG_M = { id: 't-m', label: 'Mentoria' };
const TAG_V = { id: 't-v', label: 'Voluntariado' };
const ALL = [TAG_A, TAG_M, TAG_V];

describe('UserTagsCell — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssign.mockResolvedValue({ ok: true });
    mockUnassign.mockResolvedValue({ ok: true });
  });

  it('mostra placeholder quando sem etiquetas', () => {
    render(<UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[]} allTags={ALL} />);
    expect(screen.getByText(/sem etiquetas/i)).toBeInTheDocument();
  });

  it('mostra cada etiqueta atribuída como pill com botão remover', () => {
    render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[TAG_M]} allTags={ALL} />,
    );
    expect(
      screen.getByRole('button', { name: /remover etiqueta mentoria de joão/i }),
    ).toBeInTheDocument();
  });

  it('só mostra select de adicionar quando há etiquetas disponíveis', () => {
    const { rerender } = render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={ALL} allTags={ALL} />,
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    rerender(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[]} allTags={ALL} />,
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('options do select excluem as etiquetas já atribuídas', () => {
    render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[TAG_M]} allTags={ALL} />,
    );
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    const optionLabels = Array.from(select.options).map((o) => o.label);
    expect(optionLabels).toContain('Aluno');
    expect(optionLabels).toContain('Voluntariado');
    expect(optionLabels).not.toContain('Mentoria');
  });
});

describe('UserTagsCell — optimistic add/remove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssign.mockResolvedValue({ ok: true });
    mockUnassign.mockResolvedValue({ ok: true });
  });

  it('clicar numa pill chama unassignTagAction com userId+tagId', async () => {
    const user = userEvent.setup();
    render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[TAG_M]} allTags={ALL} />,
    );
    const pill = screen.getByRole('button', { name: /remover etiqueta mentoria/i });
    await act(async () => {
      await user.click(pill);
    });
    expect(mockUnassign).toHaveBeenCalledTimes(1);
    const fd = mockUnassign.mock.calls[0][0] as FormData;
    expect(fd.get('userId')).toBe(USER_ID);
    expect(fd.get('tagId')).toBe(TAG_M.id);
  });

  it('submeter o select chama assignTagAction com tagId escolhido', async () => {
    const user = userEvent.setup();
    render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[]} allTags={ALL} />,
    );
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, TAG_A.id);
    const addBtn = screen.getByRole('button', { name: /adicionar/i });
    await act(async () => {
      await user.click(addBtn);
    });
    expect(mockAssign).toHaveBeenCalledTimes(1);
    const fd = mockAssign.mock.calls[0][0] as FormData;
    expect(fd.get('userId')).toBe(USER_ID);
    expect(fd.get('tagId')).toBe(TAG_A.id);
  });

  it('a pill desaparece imediatamente ao clicar (optimistic; mock pending)', async () => {
    mockUnassign.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[TAG_M]} allTags={ALL} />,
    );
    expect(screen.getByRole('button', { name: /remover etiqueta mentoria/i })).toBeInTheDocument();
    const pill = screen.getByRole('button', { name: /remover etiqueta mentoria/i });
    await act(async () => {
      await user.click(pill);
    });
    expect(
      screen.queryByRole('button', { name: /remover etiqueta mentoria/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/sem etiquetas/i)).toBeInTheDocument();
  });

  it('a pill aparece imediatamente ao adicionar (optimistic; mock pending)', async () => {
    mockAssign.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(
      <UserTagsCell userId={USER_ID} userName={USER_NAME} assigned={[]} allTags={ALL} />,
    );
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, TAG_A.id);
    const addBtn = screen.getByRole('button', { name: /^adicionar$/i });
    await act(async () => {
      await user.click(addBtn);
    });
    expect(screen.getByRole('button', { name: /remover etiqueta aluno/i })).toBeInTheDocument();
  });
});
