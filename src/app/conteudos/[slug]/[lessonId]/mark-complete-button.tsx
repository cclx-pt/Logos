'use client';

import { startTransition, useOptimistic } from 'react';
import { Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  markLessonCompleteAction,
  unmarkLessonCompleteAction,
} from '@/lib/courses/completion-actions';

type Props = {
  lessonId: string;
  initiallyCompleted: boolean;
};

/**
 * MarkCompleteButton — toggle binário "Marcar como concluída" ↔ "Concluída".
 * Optimistic: o estado visual muda imediatamente; a Server Action corre via
 * `startTransition`. Em falha sem revalidate, `useOptimistic` reverte para
 * o `initiallyCompleted` original.
 */
export function MarkCompleteButton({ lessonId, initiallyCompleted }: Props) {
  const [completed, applyOptimistic] = useOptimistic(
    initiallyCompleted,
    (_state, next: boolean) => next,
  );

  function handleToggle() {
    const next = !completed;
    startTransition(async () => {
      applyOptimistic(next);
      if (next) {
        await markLessonCompleteAction(lessonId);
      } else {
        await unmarkLessonCompleteAction(lessonId);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={completed}
      className={cn(
        'focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
        completed
          ? 'border-orange-primary/40 bg-orange-primary/10 text-orange-primary hover:bg-orange-primary/20 border'
          : 'border-border text-ink hover:bg-muted/40 border',
      )}
    >
      <Check
        aria-hidden="true"
        className={cn('h-4 w-4 transition-opacity', completed ? 'opacity-100' : 'opacity-50')}
      />
      <span>{completed ? 'Concluída' : 'Marcar como concluída'}</span>
    </button>
  );
}
