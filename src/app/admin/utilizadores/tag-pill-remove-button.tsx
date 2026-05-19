'use client';

import { useFormStatus } from 'react-dom';

import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  ariaLabel: string;
};

/**
 * TagPillRemoveButton — botão submit em forma de pill que mostra o label
 * da etiqueta + um `×` (ou Spinner enquanto a Server Action corre).
 *
 * Vive como Client Component próprio porque o `SubmitButton` standard
 * tem children textuais; aqui a children é uma estrutura `{label}{×|spinner}`
 * que precisa de reagir a `useFormStatus`. Forma do pill foi mantida igual
 * à versão anterior (border + bg-sage-card + hover destructive).
 */
export function TagPillRemoveButton({ label, ariaLabel }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending || undefined}
      aria-label={ariaLabel}
      className={cn(
        'border-border bg-sage-card text-ink hover:bg-destructive/10 hover:border-destructive/30 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-70',
      )}
    >
      {label}
      {pending ? (
        <Spinner className="text-muted-foreground" label={`A remover etiqueta ${label}`} />
      ) : (
        <span aria-hidden="true" className="text-muted-foreground">
          ×
        </span>
      )}
    </button>
  );
}
