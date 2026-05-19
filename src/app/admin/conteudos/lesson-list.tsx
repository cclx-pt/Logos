'use client';

import { startTransition, useOptimistic } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { moveLessonDownAction, moveLessonUpAction } from './lessons-actions';

export type LessonListItem = {
  id: string;
  title: string;
  description: string | null;
  template: 'pdf' | 'video_pdf';
  youtube_url: string | null;
  position: number;
};

type Props = {
  initial: LessonListItem[];
  courseId: string;
  moduleId: string;
  editingId?: string;
  editingNode?: ReactNode;
  deletingId?: string;
  deletingNode?: ReactNode;
};

type OptimisticAction = { type: 'move'; id: string; direction: 'up' | 'down' };

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * LessonList — Client Component que renderiza as aulas de um módulo
 * com optimistic reorder. Mesmo padrão do `ModuleList`: swap imediato
 * na UI; Server Action dispara em paralelo e revalidatePath repõe a
 * verdade no próximo render.
 */
export function LessonList({
  initial,
  courseId,
  moduleId,
  editingId,
  editingNode,
  deletingId,
  deletingNode,
}: Props) {
  const [lessons, applyOptimistic] = useOptimistic(initial, (state, action: OptimisticAction) => {
    const idx = state.findIndex((l) => l.id === action.id);
    if (idx === -1) return state;
    const target = action.direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= state.length) return state;
    return swap(state, idx, target);
  });

  async function move(id: string, direction: 'up' | 'down'): Promise<void> {
    startTransition(async () => {
      applyOptimistic({ type: 'move', id, direction });
      const fd = new FormData();
      fd.set('id', id);
      fd.set('course_id', courseId);
      fd.set('module_id', moduleId);
      await (direction === 'up' ? moveLessonUpAction(fd) : moveLessonDownAction(fd));
    });
  }

  const backHref = `/admin/conteudos/${courseId}/${moduleId}`;

  if (lessons.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ainda não há aulas neste módulo. Adiciona a primeira no formulário acima.
      </p>
    );
  }

  return (
    <ol className="border-border divide-border space-y-0 divide-y overflow-hidden rounded-lg border">
      {lessons.map((lesson, index) => {
        const isEditing = editingId === lesson.id;
        const isDeleting = deletingId === lesson.id;
        const isFirst = index === 0;
        const isLast = index === lessons.length - 1;
        const lessonNumber = index + 1;

        if (isEditing && editingNode) {
          return <li key={lesson.id}>{editingNode}</li>;
        }
        if (isDeleting && deletingNode) {
          return <li key={lesson.id}>{deletingNode}</li>;
        }

        return (
          <li key={lesson.id} className="flex flex-wrap items-start gap-4 p-4">
            <div className="text-muted-foreground min-w-[2rem] text-sm font-medium tabular-nums">
              {lessonNumber}.
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-ink font-medium">{lesson.title}</p>
              <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="border-border bg-muted/40 inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] tracking-wide uppercase">
                  {lesson.template === 'video_pdf' ? 'vídeo + pdf' : 'só pdf'}
                </span>
                {lesson.template === 'video_pdf' && lesson.youtube_url ? (
                  <a
                    href={lesson.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-ink line-clamp-1 break-all underline-offset-2 hover:underline"
                  >
                    {lesson.youtube_url}
                  </a>
                ) : null}
              </div>
              {lesson.description ? (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {lesson.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => void move(lesson.id, 'up')}
                disabled={isFirst}
                aria-label={`Mover ${lesson.title} para cima`}
                className={cn(
                  'border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => void move(lesson.id, 'down')}
                disabled={isLast}
                aria-label={`Mover ${lesson.title} para baixo`}
                className={cn(
                  'border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                ↓
              </button>
              <Link
                href={`${backHref}?editar=${lesson.id}`}
                className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Editar
              </Link>
              <Link
                href={`${backHref}?apagar=${lesson.id}`}
                className="text-destructive focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
              >
                Apagar
              </Link>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
