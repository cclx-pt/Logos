'use client';

import { useState, useTransition, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { SubmitButton } from '@/components/ui/submit-button';
import { uploadToSignedUrl } from '@/lib/auth/browser-client';
import { MAX_PDF_BYTES } from './_lib/validation';
import { createLessonPdfUploadUrlAction } from './lessons-actions';

export type LessonTemplate = 'pdf' | 'video' | 'video_pdf';

/** Resultado das Server Actions de submeter (create/update); a forma comum que o form consome. */
type SubmitResult = { ok: true; id?: string } | { ok: false; error: string };

const PDF_BUCKET = 'lesson-pdfs';

type Props = {
  /** `create` mostra "Adicionar aula" e exige PDF (quando o template o usa); `edit` mostra "Guardar" + Cancelar e nunca exige PDF (mantém o actual). */
  mode: 'create' | 'edit';
  /** Server Action que recebe os METADADOS (FormData sem o ficheiro, com `pdf_storage_path`). Passada por referência pela página. */
  submitAction: (formData: FormData) => Promise<SubmitResult>;
  /** Para onde navegar após sucesso (ex.: `${backHref}?guardado=aula_criada`). */
  successRedirect: string;
  courseId: string;
  moduleId: string;
  /** Só em `edit`: id da aula a editar (vai como hidden). */
  lessonId?: string;
  defaults?: {
    title: string;
    description: string | null;
    template: LessonTemplate;
    youtube_url: string | null;
  };
  /** Href de "Cancelar" (só usado em `edit`). */
  backHref: string;
};

const TEMPLATES: { value: LessonTemplate; label: string }[] = [
  { value: 'pdf', label: 'Só PDF' },
  { value: 'video', label: 'Só vídeo' },
  { value: 'video_pdf', label: 'Vídeo + PDF' },
];

/**
 * LessonForm — Client Component partilhado por criar e editar aulas.
 *
 * Mantém o `template` seleccionado em estado para mostrar **só** os campos
 * que esse modelo usa (item 2 de V3.4):
 *   - pdf       → só o ficheiro PDF
 *   - video     → só o URL do YouTube
 *   - video_pdf → ambos
 *
 * Os campos condicionais montam/desmontam consoante o template, por isso o
 * `required` do browser acompanha automaticamente (input ausente = sem
 * validação). A validação real continua nas Server Actions + CHECK na DB.
 *
 * Título e descrição ficam sempre montados (uncontrolled via defaultValue),
 * logo o texto preserva-se ao trocar de template; só os campos de vídeo/PDF
 * é que perdem o valor ao desmontar — comportamento desejado.
 *
 * Upload directo (V3.7): o submit é orquestrado no cliente via `onSubmit` +
 * `useTransition` (não `<form action>`, que em React 19 faz reset dos campos
 * uncontrolled ao concluir - perderia o título/descrição se o upload falhasse).
 * Se há um PDF novo, pede uma signed upload URL ao servidor e envia o ficheiro
 * DIRECTAMENTE para o bucket (browser -> Storage), contornando o limite de
 * ~4.5 MB do corpo de Server Actions na Vercel. Só depois chama a `submitAction`
 * com os metadados + `pdf_storage_path` (sem o ficheiro). O `SubmitButton`
 * recebe o pending da transição explicitamente.
 */
export function LessonForm({
  mode,
  submitAction,
  successRedirect,
  courseId,
  moduleId,
  lessonId,
  defaults,
  backHref,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [template, setTemplate] = useState<LessonTemplate>(defaults?.template ?? 'pdf');
  const [error, setError] = useState<string | null>(null);
  const hasVideo = template !== 'pdf';
  const hasPdf = template !== 'video';
  const isEdit = mode === 'edit';

  async function runSubmit(formData: FormData): Promise<void> {
    setError(null);

    // 1. Se há sebenta e um ficheiro novo foi escolhido, faz upload directo.
    let pdfStoragePath: string | null = null;
    if (hasPdf) {
      const file = formData.get('pdf');
      const hasFile = file instanceof File && file.size > 0;
      if (hasFile) {
        const f = file as File;
        if (f.type !== 'application/pdf') {
          setError('O ficheiro tem de ser um PDF.');
          return;
        }
        if (f.size > MAX_PDF_BYTES) {
          const mb = (f.size / 1024 / 1024).toFixed(1);
          setError(`O PDF excede 20 MB (tem ${mb} MB).`);
          return;
        }
        const signed = await createLessonPdfUploadUrlAction(courseId);
        if (!signed.ok) {
          setError(signed.error);
          return;
        }
        const uploaded = await uploadToSignedUrl(
          PDF_BUCKET,
          signed.path,
          signed.token,
          f,
          'application/pdf',
        );
        if (!uploaded.ok) {
          setError(`Falha a enviar o PDF: ${uploaded.error}`);
          return;
        }
        pdfStoragePath = signed.path;
      } else if (!isEdit) {
        setError('É obrigatório anexar um PDF.');
        return;
      }
    }

    // 2. Chama a Server Action só com metadados - o ficheiro nunca vai no corpo
    //    (senão voltava a bater no limite da Vercel). Por isso removemos `pdf`.
    formData.delete('pdf');
    if (pdfStoragePath) formData.set('pdf_storage_path', pdfStoragePath);

    const result = await submitAction(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(successRedirect);
    router.refresh();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => runSubmit(formData));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isEdit && lessonId ? <input type="hidden" name="id" value={lessonId} /> : null}
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="module_id" value={moduleId} />

      <label className="block">
        <span className="text-muted-foreground text-xs font-medium">Título</span>
        <input
          type="text"
          name="title"
          required
          minLength={1}
          maxLength={120}
          defaultValue={defaults?.title}
          placeholder={isEdit ? undefined : 'Ex.: A entrada de Jesus em Jerusalém'}
          className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>

      <label className="block">
        <span className="text-muted-foreground text-xs font-medium">Descrição (opcional)</span>
        <textarea
          name="description"
          rows={2}
          maxLength={4000}
          defaultValue={defaults?.description ?? ''}
          placeholder={isEdit ? undefined : 'Frase curta a explicar o foco da aula.'}
          className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full resize-y rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>

      <fieldset className="border-border rounded-md border p-4">
        <legend className="text-muted-foreground px-1 text-xs font-medium">Template</legend>
        <div className="flex flex-wrap gap-3">
          {TEMPLATES.map((t) => (
            <label
              key={t.value}
              className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
            >
              <input
                type="radio"
                name="template"
                value={t.value}
                checked={template === t.value}
                onChange={() => setTemplate(t.value)}
                className="text-orange-primary focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
              />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {hasVideo ? (
        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">URL do YouTube</span>
          <input
            type="url"
            name="youtube_url"
            required
            defaultValue={defaults?.youtube_url ?? ''}
            placeholder="https://youtu.be/… ou https://www.youtube.com/watch?v=…"
            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
      ) : null}

      {hasPdf ? (
        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">
            {isEdit ? 'Substituir sebenta (opcional, até 20 MB)' : 'Sebenta PDF (até 20 MB)'}
          </span>
          <input
            type="file"
            name="pdf"
            accept="application/pdf"
            required={!isEdit}
            className="border-border bg-background text-ink file:bg-muted file:text-ink hover:file:bg-muted/80 focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:px-3 file:py-1 file:text-xs file:font-medium focus-visible:ring-2 focus-visible:outline-none"
          />
          {isEdit ? (
            <span className="text-muted-foreground mt-1 block text-[11px]">
              Deixar vazio mantém a sebenta actual.
            </span>
          ) : null}
        </label>
      ) : null}

      {error ? (
        <p
          role="alert"
          className="border-l-destructive bg-destructive/10 text-ink border-l-4 px-3 py-2 text-sm"
        >
          {error}
        </p>
      ) : null}

      <div className={isEdit ? 'flex flex-wrap items-start gap-2' : 'flex justify-end'}>
        <SubmitButton
          pending={isPending}
          pendingLabel={hasPdf ? 'A enviar…' : 'A guardar…'}
          showProgressBar={hasPdf}
          className={isEdit ? 'h-9 px-3 text-xs' : undefined}
        >
          {isEdit ? 'Guardar' : 'Adicionar aula'}
        </SubmitButton>
        {isEdit ? (
          <Link
            href={backHref}
            className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
          >
            Cancelar
          </Link>
        ) : null}
      </div>
    </form>
  );
}
