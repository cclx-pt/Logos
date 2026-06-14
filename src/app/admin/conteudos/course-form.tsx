import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';
import { IconPicker } from './icon-picker';

export type TagOption = { id: string; label: string };

/** Opção do select de curso pré-requisito (V3.6). */
export type CourseOption = { id: string; title: string };

export type CourseFormInitialData = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  required_tags: string[];
  published_at: string | null;
  /** Signed URL do banner actual (V3.2 PR1), se existir. Para preview no form. */
  bannerUrl: string | null;
  /** V3.6: aulas em ordem obrigatória. */
  sequential: boolean;
  /** V3.6: id do curso pré-requisito, ou `null` se autónomo. */
  prerequisite_course_id: string | null;
};

type CourseFormProps = {
  mode: 'create' | 'edit';
  tags: TagOption[];
  /**
   * V3.6: outros cursos elegíveis como pré-requisito. No modo `edit` já vem
   * sem o próprio curso (evita auto-referência na UI).
   */
  courseOptions: CourseOption[];
  course?: CourseFormInitialData;
  action: (formData: FormData) => void | Promise<void>;
};

export function CourseForm({ mode, tags, courseOptions, course, action }: CourseFormProps) {
  const submitLabel = mode === 'create' ? 'Criar curso' : 'Guardar alterações';
  const pendingLabel = mode === 'create' ? 'A criar curso…' : 'A guardar…';
  const isPublished = Boolean(course?.published_at);
  const assignedTagIds = new Set(course?.required_tags ?? []);
  const isSequential = Boolean(course?.sequential);
  const prerequisiteId = course?.prerequisite_course_id ?? '';

  return (
    <form action={action} encType="multipart/form-data" className="space-y-6">
      {mode === 'edit' && course && <input type="hidden" name="id" value={course.id} />}

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

      <fieldset className="border-border space-y-3 rounded-md border p-4">
        <legend className="text-muted-foreground px-1 text-xs font-medium">
          Banner (opcional)
        </legend>
        {course?.bannerUrl ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-xs">Banner actual:</p>
            <div className="border-border relative aspect-video w-full max-w-md overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={course.bannerUrl}
                alt="Banner actual do curso"
                className="h-full w-full object-cover"
              />
            </div>
            <label className="text-ink inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="remove_banner"
                className="text-orange-primary focus-visible:ring-ring rounded focus-visible:ring-2 focus-visible:outline-none"
              />
              Remover banner actual
            </label>
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">
            Sem banner — o catálogo mostra o ícone abaixo. Carrega um ficheiro para substituir.
          </p>
        )}
        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">
            {course?.bannerUrl ? 'Substituir banner' : 'Adicionar banner'}
          </span>
          <input
            type="file"
            name="banner"
            accept="image/jpeg,image/png,image/webp"
            className="text-muted-foreground file:border-border file:bg-muted/40 file:text-ink hover:file:bg-muted/60 mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border file:px-3 file:py-1.5 file:text-sm file:font-medium"
          />
        </label>
        <p className="text-muted-foreground text-xs">
          JPEG, PNG ou WebP — máx 5 MB. Recomendação: proporção 16:9, ≤ 500 KB já comprimido.
        </p>
      </fieldset>

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

      <fieldset className="border-border space-y-4 rounded-md border p-4">
        <legend className="text-muted-foreground px-1 text-xs font-medium">
          Sequência e pré-requisitos
        </legend>

        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="sequential"
            defaultChecked={isSequential}
            className="text-orange-primary focus-visible:ring-ring mt-0.5 rounded focus-visible:ring-2 focus-visible:outline-none"
          />
          <span className="text-ink text-sm font-medium">
            Conteúdo sequencial{' '}
            <span className="text-muted-foreground block text-xs font-normal">
              As aulas (e por consequência os módulos) têm de ser concluídas pela ordem definida -
              fazer a aula 2 exige concluir a aula 1.
            </span>
          </span>
        </label>

        <label className="block">
          <span className="text-muted-foreground text-xs font-medium">Curso pré-requisito</span>
          <select
            name="prerequisite_course_id"
            defaultValue={prerequisiteId}
            className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            <option value="">Nenhum (curso autónomo)</option>
            {courseOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
          <span className="text-muted-foreground mt-1 block text-xs">
            Se escolheres um curso, este só fica disponível depois de o aluno o concluir. Encadeia
            cursos (A → B → C) para criar uma sequência; deixa em branco para um curso autónomo.
          </span>
        </label>
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
