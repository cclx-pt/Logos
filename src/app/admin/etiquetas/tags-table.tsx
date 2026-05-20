'use client';

import { startTransition, useOptimistic } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

import { SubmitButton } from '@/components/ui/submit-button';
import { deleteTagAction, updateTagAction } from './actions';

export type TagListItem = {
  id: string;
  label: string;
  created_at: string;
};

type Props = {
  initial: TagListItem[];
  /** Id em modo edit (`?editar=`). Continua URL-driven. */
  editingId?: string;
  /** Id em modo delete confirm (`?apagar=`). Continua URL-driven. */
  confirmingDeleteId?: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * TagsTable — Client Component que renderiza a lista de etiquetas com
 * optimistic delete: clicar "Apagar definitivamente" faz a linha sair
 * imediatamente da tabela, em paralelo a `deleteTagAction`. Quando a action
 * termina e `revalidatePath('/admin/etiquetas')` corre, o `initial` muda e o
 * estado optimistic reseta. Em falha (sem revalidate), o optimistic reverte
 * para o `initial` original — a linha volta a aparecer.
 *
 * Editar continua via Server Action server-side (action passada ao form
 * pelos imports `'use server'`). O reorder das tags é alfabético no server;
 * não há reorder manual.
 */
export function TagsTable({ initial, editingId, confirmingDeleteId }: Props) {
  const [tags, applyOptimistic] = useOptimistic(initial, (state, removedId: string) =>
    state.filter((t) => t.id !== removedId),
  );

  function handleDelete(id: string) {
    startTransition(async () => {
      applyOptimistic(id);
      const fd = new FormData();
      fd.set('id', id);
      const result = await deleteTagAction(fd);
      if (result.ok) {
        toast.success('Etiqueta apagada.');
      } else {
        toast.error('Algo correu mal. Tenta de novo.');
      }
    });
  }

  if (tags.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Ainda não há etiquetas. Cria uma no formulário acima.
      </p>
    );
  }

  return (
    <div className="border-border overflow-hidden rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
          <tr>
            <th scope="col" className="px-4 py-2 font-medium">
              Nome
            </th>
            <th scope="col" className="px-4 py-2 font-medium">
              Criada em
            </th>
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-border divide-y">
          {tags.map((tag) => {
            const isEditing = editingId === tag.id;
            const isConfirmingDelete = confirmingDeleteId === tag.id;

            if (isEditing) {
              return (
                <tr key={tag.id} className="bg-muted/20">
                  <td colSpan={3} className="px-4 py-3">
                    <form
                      action={(formData) => {
                        startTransition(async () => {
                          const result = await updateTagAction(formData);
                          if (result.ok) {
                            toast.success('Etiqueta guardada.');
                          } else {
                            toast.error('Algo correu mal. Tenta de novo.');
                          }
                        });
                      }}
                      className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
                    >
                      <input type="hidden" name="id" value={tag.id} />
                      <label className="block">
                        <span className="text-muted-foreground text-xs font-medium">Nome</span>
                        <input
                          type="text"
                          name="label"
                          required
                          defaultValue={tag.label}
                          minLength={1}
                          maxLength={80}
                          className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                        />
                      </label>
                      <SubmitButton pendingLabel="A guardar…">Guardar</SubmitButton>
                      <Link
                        href="/admin/etiquetas"
                        className="text-muted-foreground hover:text-ink focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                      >
                        Cancelar
                      </Link>
                    </form>
                  </td>
                </tr>
              );
            }

            if (isConfirmingDelete) {
              return (
                <tr key={tag.id} className="border-l-destructive bg-destructive/10 border-l-4">
                  <td colSpan={3} className="px-4 py-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-ink text-sm">
                        Apagar a etiqueta <strong className="font-semibold">{tag.label}</strong>?
                        Esta ação remove-a de todos os utilizadores e não pode ser revertida.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(tag.id)}
                          className="bg-destructive hover:bg-destructive/90 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Apagar definitivamente
                        </button>
                        <Link
                          href="/admin/etiquetas"
                          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                        >
                          Cancelar
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={tag.id} className="text-ink">
                <td className="px-4 py-3 font-medium">{tag.label}</td>
                <td className="px-4 py-3 text-sm">{formatDate(tag.created_at)}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link
                      href={`/admin/etiquetas?editar=${tag.id}`}
                      className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      Editar
                    </Link>
                    <Link
                      href={`/admin/etiquetas?apagar=${tag.id}`}
                      className="text-destructive focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
                    >
                      Apagar
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
