import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';
import { IconPicker } from './icon-picker';

export type TagOption = { id: string; label: string };

export type CourseFormInitialData = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  icon: string | null;
  required_tags: string[];
  published_at: string | null;
};

type CourseFormProps = {
  mode: 'create' | 'edit';
  tags: TagOption[];
  course?: CourseFormInitialData;
  action: (formData: FormData) => void | Promise<void>;
};

export function CourseForm({ mode, tags, course, action }: CourseFormProps) {
  const submitLabel = mode === 'create' ? 'Criar curso' : 'Guardar alterações';
  const pendingLabel = mode === 'create' ? 'A criar curso…' : 'A guardar…';
  const isPublished = Boolean(course?.published_at);
  const assignedTagIds = new Set(course?.required_tags ?? []);

  return (
    <form action={action} className="space-y-6">
      {mode === 'edit' && course && <input type="hidden" name="id" value={course.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">Título</span>
          <input
            type="text"
            name="title"
            required
            maxLength={120}
            defaultValue={course?.title ?? ''}
            placeholder="Ex.: Introdução ao Evangelho de Marcos"
            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>

        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">
            Slug (kebab-case, estável)
          </span>
          <input
            type="text"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={2}
            maxLength={80}
            defaultValue={course?.slug ?? ''}
            placeholder="ex.: marcos-introducao"
            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-muted-foreground text-xs font-medium">Descrição (texto puro)</span>
        <textarea
          name="description"
          rows={5}
          maxLength={4000}
          defaultValue={course?.description ?? ''}
          placeholder="Breve descrição do curso visível no catálogo."
          className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
        />
      </label>

      <IconPicker selected={course?.icon ?? null} />

      <fieldset className="border-border rounded-md border p-4">
        <legend className="text-muted-foreground px-1 text-xs font-medium">
          Etiquetas necessárias (acesso restrito)
        </legend>
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Não há etiquetas criadas. Cursos sem etiquetas são públicos a todos os autenticados.{' '}
            <Link href="/admin/etiquetas" className="text-orange-primary hover:underline">
              Criar etiqueta
            </Link>
          </p>
        ) : (
          <>
            <p className="text-muted-foreground mb-3 text-xs">
              Sem nenhuma seleccionada, o curso é visível a todos os autenticados. Com uma ou mais,
              só utilizadores com pelo menos uma das etiquetas o vêem.
            </p>
            <div className="flex flex-wrap gap-3">
              {tags.map((tag) => (
                <label
                  key={tag.id}
                  className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary/40 inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <input
                    type="checkbox"
                    name="required_tags"
                    value={tag.id}
                    defaultChecked={assignedTagIds.has(tag.id)}
                    className="text-orange-primary focus-visible:ring-ring rounded focus-visible:ring-2 focus-visible:outline-none"
                  />
                  <span>{tag.label}</span>
                </label>
              ))}
            </div>
          </>
        )}
      </fieldset>

      <label className="border-border bg-card flex items-center gap-3 rounded-md border p-4">
        <input
          type="checkbox"
          name="published"
          defaultChecked={isPublished}
          className="text-orange-primary focus-visible:ring-ring rounded focus-visible:ring-2 focus-visible:outline-none"
        />
        <span className="text-ink text-sm font-medium">
          Publicado{' '}
          <span className="text-muted-foreground text-xs font-normal">
            (visível no catálogo público; drafts só aparecem para admins)
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-start gap-3">
        <SubmitButton pendingLabel={pendingLabel}>{submitLabel}</SubmitButton>
        <Link
          href="/admin/conteudos"
          className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium focus-visible:ring-2 focus-visible:outline-none"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
