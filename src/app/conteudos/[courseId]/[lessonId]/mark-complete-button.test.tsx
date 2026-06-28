import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockMark, mockUnmark } = vi.hoisted(() => ({
  mockMark: vi.fn(),
  mockUnmark: vi.fn(),
}));

vi.mock('@/lib/courses/completion-actions', () => ({
  markLessonCompleteAction: mockMark,
  unmarkLessonCompleteAction: mockUnmark,
}));

import { MarkCompleteButton } from './mark-complete-button';

const LESSON_ID = '22222222-2222-4222-8222-222222222222';

describe('MarkCompleteButton — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renderiza "Marcar como concluída" quando initiallyCompleted=false', () => {
    render(<MarkCompleteButton lessonId={LESSON_ID} initiallyCompleted={false} />);
    const btn = screen.getByRole('button', { name: /marcar como concluída/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('renderiza "Concluída" quando initiallyCompleted=true', () => {
    render(<MarkCompleteButton lessonId={LESSON_ID} initiallyCompleted={true} />);
    const btn = screen.getByRole('button', { name: /^concluída$/i });
    expect(btn).toBeInTheDocument();
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('MarkCompleteButton — toggle optimistic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clicar quando idle chama markLessonCompleteAction e mostra "Concluída" imediato (optimistic)', async () => {
    mockMark.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<MarkCompleteButton lessonId={LESSON_ID} initiallyCompleted={false} />);
    const btn = screen.getByRole('button', { name: /marcar como concluída/i });
    await act(async () => {
      await user.click(btn);
    });
    expect(mockMark).toHaveBeenCalledWith(LESSON_ID);
    expect(screen.getByRole('button', { name: /^concluída$/i })).toBeInTheDocument();
  });

  it('clicar quando concluída chama unmarkLessonCompleteAction e mostra "Marcar como concluída" imediato', async () => {
    mockUnmark.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<MarkCompleteButton lessonId={LESSON_ID} initiallyCompleted={true} />);
    const btn = screen.getByRole('button', { name: /^concluída$/i });
    await act(async () => {
      await user.click(btn);
    });
    expect(mockUnmark).toHaveBeenCalledWith(LESSON_ID);
    expect(screen.getByRole('button', { name: /marcar como concluída/i })).toBeInTheDocument();
  });
});
