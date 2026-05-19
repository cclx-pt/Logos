'use client';

import { startTransition, useOptimistic } from 'react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { moveModuleDownAction, moveModuleUpAction } from './modules-actions';

export type ModuleListItem = {
  id: string;
  title: string;
  description: string | null;
  position: number;
};

type Props = {
  initial: ModuleListItem[];
  courseId: string;
  /** Id em modo edit (`?editar=`). Quando bate com um item, mostra o `editingNode`. */
  editingId?: string;
  /** Nó pré-renderizado no Server Component que substitui o item em modo edit (form com Server Actions). */
  editingNode?: ReactNode;
  /** Id em modo delete confirm (`?apagar=`). */
  deletingId?: string;
  /** Nó pré-renderizado no Server Component que substitui o item em modo delete confirm. */
  deletingNode?: ReactNode;
};

type OptimisticAction = { type: 'move'; id: string; direction: 'up' | 'down' };

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * ModuleList — Client Component que renderiza a lista de módulos de um
 * curso com **optimistic reorder**. Clicar nas setas ↑/↓ faz swap
 * imediato na UI; em paralelo dispara a Server Action que persiste a
 * nova `position`. Quando o server confirma e re-renderiza (via
 * `revalidatePath`), o `initial` muda e o estado optimistic reseta.
 *
 * Os modos edit/delete continuam URL-driven (`?editar=`, `?apagar=`).
 * O Server Component pai pré-renderiza o JSX desses estados (que
 * contêm Server Actions inline) e passa-o via `editingNode` /
 * `deletingNode`. Funções não passam para Client Components, JSX
 * pré-renderizado passa.
 */
export function ModuleList({
  initial,
  courseId,
  editingId,
  editingNode,
  deletingId,
  deletingNode,
}: Props) {
  const [modules, applyOptimistic] = useOptimistic(initial, (state, action: OptimisticAction) => {
    const idx = state.findIndex((m) => m.id === action.id);
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
      await (direction === 'up' ? moveModuleUpAction(fd) : moveModuleDownAction(fd));
    });
  }

  if (modules.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ainda não há módulos. Adiciona o primeiro no formulário acima.
      </p>
    );
  }

  return (
    <ol className="border-border divide-border space-y-0 divide-y overflow-hidden rounded-lg border">
      {modules.map((module, index) => {
        const isEditing = editingId === module.id;
        const isDeleting = deletingId === module.id;
        const isFirst = index === 0;
        const isLast = index === modules.length - 1;
        const moduleNumber = index + 1;

        if (isEditing && editingNode) {
          return <li key={module.id}>{editingNode}</li>;
        }
        if (isDeleting && deletingNode) {
          return <li key={module.id}>{deletingNode}</li>;
        }

        return (
          <li key={module.id} className="flex flex-wrap items-start gap-4 p-4">
            <div className="text-muted-foreground min-w-[2rem] text-sm font-medium tabular-nums">
              {moduleNumber}.
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-ink font-medium">{module.title}</p>
              {module.description ? (
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                  {module.description}
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => void move(module.id, 'up')}
                disabled={isFirst}
                aria-label={`Mover ${module.title} para cima`}
                className={cn(
                  'border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => void move(module.id, 'down')}
                disabled={isLast}
                aria-label={`Mover ${module.title} para baixo`}
                className={cn(
                  'border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-8 w-8 items-center justify-center rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                ↓
              </button>
              <Link
                href={`/admin/conteudos/${courseId}/${module.id}`}
                className="border-orange-primary/30 text-orange-primary hover:bg-orange-primary/10 focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md border px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Aulas →
              </Link>
              <Link
                href={`/admin/conteudos/${courseId}?editar=${module.id}`}
                className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Editar
              </Link>
              <Link
                href={`/admin/conteudos/${courseId}?apagar=${module.id}`}
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
