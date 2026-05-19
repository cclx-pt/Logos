'use client';

import { useFormStatus } from 'react-dom';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';
import { Spinner } from './spinner';
import { ProgressBar } from './progress-bar';

type SubmitButtonProps = {
  children: ReactNode;
  /** Texto a mostrar enquanto pending (substitui children quando true). */
  pendingLabel?: string;
  /** Mostra `<ProgressBar />` abaixo do botão enquanto pending. Útil para uploads. */
  showProgressBar?: boolean;
  className?: string;
};

/**
 * SubmitButton — botão submit que reage ao estado pending do form pai via
 * `useFormStatus` (React 19). Mostra um `Spinner` + label alternativo
 * enquanto a Server Action corre. Opcionalmente mostra uma `ProgressBar`
 * indeterminada abaixo (para uploads longos onde queremos sinalizar que
 * "ainda está a trabalhar").
 *
 * Tem de ser Client Component porque `useFormStatus` usa contexto do
 * React. Não tem outro JS — quando o form não está pending, comporta-se
 * como um `<button type="submit">` normal.
 */
export function SubmitButton({
  children,
  pendingLabel = 'A guardar…',
  showProgressBar = false,
  className,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <div className="flex flex-col gap-2">
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending || undefined}
        className={cn(
          'bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-70',
          className,
        )}
      >
        {pending ? (
          <>
            <Spinner className="text-white" label={pendingLabel} />
            <span>{pendingLabel}</span>
          </>
        ) : (
          children
        )}
      </button>
      {showProgressBar && pending ? <ProgressBar label={pendingLabel} /> : null}
    </div>
  );
}
