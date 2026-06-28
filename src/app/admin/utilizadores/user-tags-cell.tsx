'use client';

import { startTransition, useOptimistic, useRef } from 'react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { assignTagAction, unassignTagAction } from './actions';

type TagItem = { id: string; label: string };

type Props = {
  userId: string;
  userName: string;
  assigned: TagItem[];
  /** Catálogo completo de etiquetas. UserTagsCell calcula o subset disponível filtrando o que já está atribuído. */
  allTags: TagItem[];
};

type OptimisticAction = { type: 'add'; tag: TagItem } | { type: 'remove'; tagId: string };

/**
 * UserTagsCell — célula da tabela de utilizadores que mostra as etiquetas
 * atribuídas como pills + um select para adicionar mais. Aplica `useOptimistic`
 * para ambas as operações (add/remove): a pill aparece ou desaparece
 * imediatamente, sem esperar pela Server Action. Quando esta termina e
 * `revalidatePath` chega, o estado optimistic reseta naturalmente.
 *
 * Em caso de falha da action, o `revalidatePath` (executado no final tanto em
 * sucesso como em erro) repõe a verdade do server e o estado optimistic
 * reverte — o utilizador vê a pill voltar/desaparecer. Toast de erro fica
 * para iteração futura.
 */
export function UserTagsCell({ userId, userName, assigned, allTags }: Props) {
  const [tags, applyOptimistic] = useOptimistic(assigned, (state, action: OptimisticAction) => {
    if (action.type === 'add') {
      if (state.some((t) => t.id === action.tag.id)) return state;
      return [...state, action.tag].sort((a, b) => a.label.localeCompare(b.label, 'pt-PT'));
    }
    return state.filter((t) => t.id !== action.tagId);
  });

  const formRef = useRef<HTMLFormElement>(null);
  const assignedIds = new Set(tags.map((t) => t.id));
  const available = allTags.filter((t) => !assignedIds.has(t.id));

  function handleAdd(formData: FormData) {
    const tagId = formData.get('tagId');
    if (typeof tagId !== 'string' || tagId === '') return;
    const tag = allTags.find((t) => t.id === tagId);
    if (!tag) return;
    startTransition(async () => {
      applyOptimistic({ type: 'add', tag });
      formRef.current?.reset();
      const fd = new FormData();
      fd.set('userId', userId);
      fd.set('tagId', tagId);
      const result = await assignTagAction(fd);
      if (result.ok) {
        toast.success(`Etiqueta "${tag.label}" atribuída.`);
      } else {
        toast.error('Algo correu mal. Tenta de novo.');
      }
    });
  }

  function handleRemove(tagId: string) {
    const tag = allTags.find((t) => t.id === tagId);
    startTransition(async () => {
      applyOptimistic({ type: 'remove', tagId });
      const fd = new FormData();
      fd.set('userId', userId);
      fd.set('tagId', tagId);
      const result = await unassignTagAction(fd);
      if (result.ok) {
        toast.success(tag ? `Etiqueta "${tag.label}" removida.` : 'Etiqueta removida.');
      } else {
        toast.error('Algo correu mal. Tenta de novo.');
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {tags.length === 0 ? (
          <span className="text-muted-foreground text-xs">Sem etiquetas</span>
        ) : (
          tags.map((tag) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleRemove(tag.id)}
              aria-label={`Remover etiqueta ${tag.label} de ${userName}`}
              className={cn(
                'border-border bg-sage-card text-ink hover:bg-destructive/10 hover:border-destructive/30 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
              )}
            >
              {tag.label}
              <span aria-hidden="true" className="text-muted-foreground">
                ×
              </span>
            </button>
          ))
        )}
      </div>
      {available.length > 0 && (
        <form ref={formRef} action={handleAdd} className="mt-2 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor={`tag-select-${userId}`}>
            Adicionar etiqueta a {userName}
          </label>
          <select
            id={`tag-select-${userId}`}
            name="tagId"
            required
            defaultValue=""
            className="border-border bg-background text-ink focus-visible:ring-ring rounded-md border px-2 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
          >
            <option value="" disabled>
              Adicionar etiqueta…
            </option>
            {available.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="text-orange-primary hover:text-orange-hover hover:bg-muted/40 focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Adicionar
          </button>
        </form>
      )}
    </div>
  );
}
