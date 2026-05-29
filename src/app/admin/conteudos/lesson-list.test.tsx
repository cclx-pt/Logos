import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMoveUp, mockMoveDown } = vi.hoisted(() => ({
  mockMoveUp: vi.fn(),
  mockMoveDown: vi.fn(),
}));

vi.mock('./lessons-actions', () => ({
  moveLessonUpAction: mockMoveUp,
  moveLessonDownAction: mockMoveDown,
}));

import { LessonList, type LessonListItem } from './lesson-list';

const COURSE_ID = 'c1';
const MODULE_ID = 'm1';

function makeLessons(): LessonListItem[] {
  return [
    {
      id: 'l-a',
      title: 'Aula A',
      description: 'desc A',
      template: 'pdf',
      youtube_url: null,
      position: 0,
    },
    {
      id: 'l-b',
      title: 'Aula B',
      description: null,
      template: 'video_pdf',
      youtube_url: 'https://youtu.be/abc123',
      position: 1,
    },
    {
      id: 'l-c',
      title: 'Aula C',
      description: 'desc C',
      template: 'pdf',
      youtube_url: null,
      position: 2,
    },
  ];
}

describe('LessonList — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMoveUp.mockResolvedValue({ ok: true });
    mockMoveDown.mockResolvedValue({ ok: true });
  });

  it('mostra placeholder quando lista vazia', () => {
    render(
      <LessonList initial={[]} courseId={COURSE_ID} moduleId={MODULE_ID} modulePosition={2} />,
    );
    expect(screen.getByText(/ainda não há aulas/i)).toBeInTheDocument();
  });

  it('renderiza um item por aula com numeração {módulo}.{aula}', () => {
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    expect(screen.getByText('Aula A')).toBeInTheDocument();
    expect(screen.getByText('Aula B')).toBeInTheDocument();
    expect(screen.getByText('Aula C')).toBeInTheDocument();
    expect(screen.getByText('2.1')).toBeInTheDocument();
    expect(screen.getByText('2.2')).toBeInTheDocument();
    expect(screen.getByText('2.3')).toBeInTheDocument();
  });

  it('mostra pill do template (pdf / vídeo + pdf)', () => {
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    expect(screen.getAllByText(/só pdf/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/vídeo \+ pdf/i)).toBeInTheDocument();
  });

  it('renderiza link YouTube apenas para aulas video_pdf', () => {
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    const link = screen.getByRole('link', { name: /youtu\.be\/abc123/i });
    expect(link).toHaveAttribute('href', 'https://youtu.be/abc123');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('substitui o item editingId pelo editingNode pré-renderizado', () => {
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={1}
        editingId="l-b"
        editingNode={<form data-testid="edit-form">edit Aula B</form>}
      />,
    );
    expect(screen.getByTestId('edit-form')).toBeInTheDocument();
  });

  it('substitui o item deletingId pelo deletingNode pré-renderizado', () => {
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={1}
        deletingId="l-c"
        deletingNode={<div data-testid="delete-confirm">apagar?</div>}
      />,
    );
    expect(screen.getByTestId('delete-confirm')).toBeInTheDocument();
  });
});

describe('LessonList — optimistic reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMoveUp.mockResolvedValue({ ok: true });
    mockMoveDown.mockResolvedValue({ ok: true });
  });

  it('clicar ↑ na primeira aula é no-op (disabled)', async () => {
    const user = userEvent.setup();
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    const upA = screen.getByRole('button', { name: /mover aula a para cima/i });
    expect(upA).toBeDisabled();
    await user.click(upA);
    expect(mockMoveUp).not.toHaveBeenCalled();
  });

  it('clicar ↓ na última aula é no-op (disabled)', async () => {
    const user = userEvent.setup();
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    const downC = screen.getByRole('button', { name: /mover aula c para baixo/i });
    expect(downC).toBeDisabled();
    await user.click(downC);
    expect(mockMoveDown).not.toHaveBeenCalled();
  });

  it('clicar ↑ na aula B chama moveLessonUpAction com FormData', async () => {
    const user = userEvent.setup();
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    const upB = screen.getByRole('button', { name: /mover aula b para cima/i });
    await act(async () => {
      await user.click(upB);
    });
    expect(mockMoveUp).toHaveBeenCalledTimes(1);
    const fd = mockMoveUp.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('l-b');
    expect(fd.get('course_id')).toBe(COURSE_ID);
    expect(fd.get('module_id')).toBe(MODULE_ID);
  });

  it('clicar ↓ na aula B chama moveLessonDownAction', async () => {
    const user = userEvent.setup();
    render(
      <LessonList
        initial={makeLessons()}
        courseId={COURSE_ID}
        moduleId={MODULE_ID}
        modulePosition={2}
      />,
    );
    const downB = screen.getByRole('button', { name: /mover aula b para baixo/i });
    await act(async () => {
      await user.click(downB);
    });
    expect(mockMoveDown).toHaveBeenCalledTimes(1);
    const fd = mockMoveDown.mock.calls[0][0] as FormData;
    expect(fd.get('id')).toBe('l-b');
    expect(fd.get('module_id')).toBe(MODULE_ID);
  });
});
