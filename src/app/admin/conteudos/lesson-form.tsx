'use client';

import { useState } from 'react';
import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';

export type LessonTemplate = 'pdf' | 'video' | 'video_pdf';

type Props = {
  /** `create` mostra "Adicionar aula" e exige PDF (quando o template o usa); `edit` mostra "Guardar" + Cancelar e nunca exige PDF (mantém o actual). */
  mode: 'create' | 'edit';
  /** Server Action que recebe o FormData. Definida na página (Server Component) e passada por referência. */
  action: (formData: FormData) => void | Promise<void>;
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
 */
export function LessonForm({
  mode,
  action,
  courseId,
  moduleId,
  lessonId,
  defaults,
  backHref,
}: Props) {
  const [template, setTemplate] = useState<LessonTemplate>(defaults?.template ?? 'pdf');
  const hasVideo = template !== 'pdf';
  const hasPdf = template !== 'video';
  const isEdit = mode === 'edit';

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
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
            {isEdit ? 'Substituir apostila (opcional, até 20 MB)' : 'Apostila PDF (até 20 MB)'}
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
              Deixar vazio mantém a apostila actual.
            </span>
          ) : null}
        </label>
      ) : null}

      <div className={isEdit ? 'flex flex-wrap items-start gap-2' : 'flex justify-end'}>
        <SubmitButton
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
