'use client';

import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Trash2 } from 'lucide-react';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import { deleteAccountAction } from '@/lib/auth/actions';

/**
 * Secção "Apagar conta" do /perfil (RGPD art. 17 — direito ao apagamento).
 * Abre um Dialog de confirmação que exige escrever APAGAR antes de submeter.
 * A Server Action apaga o profile (cascata para todos os dados do utilizador)
 * e a identidade, depois termina a sessão e redirecciona para a home.
 */
export function DeleteAccountSection() {
  const [state, formAction] = useActionState(deleteAccountAction, { status: 'idle' as const });
  const [open, setOpen] = useState(false);
  const [confirmValue, setConfirmValue] = useState('');
  const fieldId = useId();
  const canSubmit = confirmValue.trim().toUpperCase() === 'APAGAR';

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setConfirmValue('');
  }

  return (
    <section className="border-destructive/30 mt-14 rounded-lg border border-dashed p-6">
      <h2 className="font-display text-ink text-lg font-medium tracking-tight">Apagar conta</h2>
      <p className="text-muted-foreground mt-2 max-w-prose font-sans text-sm leading-relaxed">
        Apaga permanentemente a tua conta e todos os dados associados: inscrições, progresso nos
        cursos, perguntas e conversas. Esta ação é irreversível.
      </p>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger className="border-destructive/40 text-destructive hover:bg-destructive/10 focus-visible:ring-destructive/30 mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-md border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
          <Trash2 aria-hidden="true" className="h-4 w-4" />
          Apagar a minha conta
        </DialogTrigger>

        <DialogContent>
          <div className="grid gap-1">
            <DialogTitle>Apagar a tua conta?</DialogTitle>
            <DialogDescription>
              Esta ação é permanente. Vais perder o acesso e todos os teus dados (inscrições,
              progresso, perguntas e conversas) serão apagados. Não é possível recuperar.
            </DialogDescription>
          </div>

          <form action={formAction} className="grid gap-3">
            <div className="grid gap-1.5">
              <label htmlFor={fieldId} className="text-ink text-sm font-medium">
                Escreve <span className="font-semibold">APAGAR</span> para confirmar
              </label>
              <input
                id={fieldId}
                name="confirm"
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="border-border bg-background text-ink focus-visible:ring-ring h-10 w-full rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
              />
            </div>

            {state.status === 'error' ? (
              <p role="alert" className="text-destructive text-sm">
                {state.message}
              </p>
            ) : null}

            <div className="mt-1 flex items-center justify-end gap-2">
              <DialogClose className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
                Cancelar
              </DialogClose>
              <DeleteSubmitButton disabled={!canSubmit} />
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}

/**
 * Botão submit destrutivo que reage ao pending do form via `useFormStatus`
 * e respeita `disabled` (gate da confirmação textual). Inline porque o
 * `SubmitButton` partilhado é laranja e não recebe `disabled`.
 */
function DeleteSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className="bg-destructive hover:bg-destructive/90 focus-visible:ring-destructive/40 inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? (
        <>
          <Spinner className="text-white" label="A apagar a conta" />
          <span>A apagar…</span>
        </>
      ) : (
        'Apagar definitivamente'
      )}
    </button>
  );
}
