'use client';

import { useState, useTransition } from 'react';
import { Trash2, TriangleAlert } from 'lucide-react';

import { deleteAccountAction } from '@/lib/auth/actions';
import { Button } from '@/components/ui/button';

/**
 * Apagar conta — RGPD art. 17 (direito ao apagamento), self-service.
 *
 * Confirmação em dois passos por ser destrutivo e irreversível: o primeiro clique
 * abre o aviso; só o segundo dispara `deleteAccountAction`. A autoridade real está
 * na função SECURITY DEFINER `delete_own_account()` — aqui é só UX.
 */
export function DeleteAccountButton() {
  const [confirming, setConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <Button variant="destructive" size="lg" onClick={() => setConfirming(true)}>
        <Trash2 aria-hidden="true" />
        Apagar a minha conta
      </Button>
    );
  }

  return (
    <div
      role="alertdialog"
      aria-label="Confirmar apagamento de conta"
      className="border-destructive/30 bg-destructive/5 space-y-4 rounded-lg border p-5"
    >
      <div className="flex gap-3">
        <TriangleAlert className="text-destructive mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-ink font-sans text-sm font-medium">Apagar a conta é permanente.</p>
          <p className="text-muted-foreground font-sans text-sm">
            A tua conta e os registos de aulas concluídas são eliminados de forma definitiva. Esta
            ação não pode ser revertida.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          size="lg"
          disabled={isPending}
          onClick={() => {
            startTransition(() => {
              void deleteAccountAction();
            });
          }}
        >
          {isPending ? 'A apagar…' : 'Sim, apagar definitivamente'}
        </Button>
        <Button
          variant="outline"
          size="lg"
          disabled={isPending}
          onClick={() => setConfirming(false)}
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}
