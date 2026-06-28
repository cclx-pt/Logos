'use client';

import { useId, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SubmitButton } from '@/components/ui/submit-button';
import { submitQuestionAction } from '@/lib/questions/actions';
import { QUESTION_BODY_MIN, QUESTION_BODY_MAX } from '@/lib/questions/question';

type Props = {
  lessonId: string;
  courseTitle: string;
  moduleTitle: string;
  lessonTitle: string;
  authorName: string;
  /** Classes do invólucro da caixa - controla a posição/visibilidade pela página. */
  className?: string;
};

/**
 * AskQuestionCard - caixa "Pergunta aos professores" no leitor de aula. Abre um
 * Dialog com um form estilo email. O cliente envia só `{ lessonId, body }`; o
 * resto (identidade + contexto) é re-derivado na Server Action. A resposta da
 * equipa chega ao aluno por email (não há inbox do aluno na app).
 *
 * Usa uma *form action* cliente (não `useActionState`) para poder fechar o
 * dialog e mostrar o toast no fim - o `SubmitButton` reage ao pending via
 * `useFormStatus` na mesma, por ser uma action de form.
 */
export function AskQuestionCard({
  lessonId,
  courseTitle,
  moduleTitle,
  lessonTitle,
  authorName,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldId = useId();
  const hintId = useId();

  async function handleSubmit(formData: FormData) {
    setError(null);
    const result = await submitQuestionAction({ status: 'idle' }, formData);
    if (result.status === 'success') {
      toast.success('Pergunta enviada. A equipa responde-te por email.');
      setOpen(false);
    } else if (result.status === 'error') {
      setError(result.message);
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setError(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <div className={cn('border-border bg-card rounded-2xl border p-5', className)}>
        <h2 className="text-ink flex items-center gap-2 text-sm font-semibold">
          <HelpCircle aria-hidden="true" className="text-orange-primary h-4 w-4" />
          Tens uma dúvida?
        </h2>
        <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
          Pergunta aos professores sobre esta aula. A resposta chega-te por email.
        </p>
        <DialogTrigger className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
          Fazer uma pergunta
        </DialogTrigger>
      </div>

      <DialogContent>
        <div className="grid gap-1">
          <DialogTitle>Pergunta aos professores</DialogTitle>
          <DialogDescription>
            Sobre: {courseTitle} › {moduleTitle} › {lessonTitle}
          </DialogDescription>
          <p className="text-muted-foreground text-sm">
            De: <span className="text-ink font-medium">{authorName}</span>
          </p>
        </div>

        <form action={handleSubmit} className="grid gap-3">
          <div className="grid gap-1.5">
            <label htmlFor={fieldId} className="text-ink text-sm font-medium">
              A tua pergunta
            </label>
            <Textarea
              id={fieldId}
              name="body"
              required
              minLength={QUESTION_BODY_MIN}
              maxLength={QUESTION_BODY_MAX}
              aria-describedby={hintId}
              placeholder="Escreve a tua dúvida sobre esta aula."
            />
            <input type="hidden" name="lessonId" value={lessonId} />
            <p id={hintId} className="text-muted-foreground text-xs">
              Entre {QUESTION_BODY_MIN} e {QUESTION_BODY_MAX} caracteres.
            </p>
          </div>

          {error ? (
            <p role="alert" className="text-destructive text-sm">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex items-center justify-end gap-2">
            <DialogClose className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
              Cancelar
            </DialogClose>
            <SubmitButton pendingLabel="A enviar…">Enviar pergunta</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
