import { HelpCircle } from 'lucide-react';

import { COURSE_ICONS } from '@/lib/courses/icons';

/**
 * IconPicker — seletor visual de ícone para CourseForm (e futuras entidades
 * que precisem de ícone). Server Component puro: usa `<input type="radio">`
 * para deixar o navegador tratar da escolha e o `:checked` da CSS para
 * destacar a selecção. Zero JavaScript no cliente.
 *
 * O valor submetido em `formData.get('icon')` é o slug kebab-case do ícone
 * (ex.: `book-open`) — mesmo formato que a coluna `courses.icon` já guardava.
 * Se o curso tem um valor pré-existente fora da lista curada (legacy ou
 * digitado manualmente), preserva-se como entrada extra "Personalizado".
 *
 * A lista de ícones disponíveis vive em `src/lib/courses/icons.tsx` —
 * partilhada com o catálogo público (`CourseIcon`).
 */

type Props = { selected: string | null };

export function IconPicker({ selected }: Props) {
  const trimmed = selected?.trim() ?? '';
  const isKnown = trimmed.length > 0 && COURSE_ICONS.some((icon) => icon.slug === trimmed);
  const showCustom = trimmed.length > 0 && !isKnown;

  return (
    <fieldset className="border-border rounded-md border p-4">
      <legend className="text-muted-foreground px-1 text-xs font-medium">
        Ícone do curso (opcional)
      </legend>
      <p className="text-muted-foreground mb-3 text-xs">
        Aparece no cartão do curso no catálogo. Escolhe um ou deixa em branco.
      </p>

      <div
        role="radiogroup"
        aria-label="Ícone do curso"
        className="grid grid-cols-6 gap-1.5 sm:grid-cols-8 md:grid-cols-10"
      >
        <label
          title="Sem ícone"
          className="border-border bg-background hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary focus-within:ring-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors focus-within:ring-2"
        >
          <input
            type="radio"
            name="icon"
            value=""
            defaultChecked={trimmed.length === 0}
            className="sr-only"
          />
          <span aria-hidden="true" className="text-muted-foreground text-lg">
            —
          </span>
          <span className="sr-only">Sem ícone</span>
        </label>

        {COURSE_ICONS.map(({ slug, Component, label }) => (
          <label
            key={slug}
            title={label}
            className="border-border bg-background text-ink hover:bg-muted/40 has-checked:bg-orange-primary/10 has-checked:border-orange-primary has-checked:text-orange-primary focus-within:ring-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors focus-within:ring-2"
          >
            <input
              type="radio"
              name="icon"
              value={slug}
              defaultChecked={trimmed === slug}
              className="sr-only"
            />
            <Component aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">{label}</span>
          </label>
        ))}

        {showCustom ? (
          <label
            title={`Personalizado: ${trimmed}`}
            className="border-destructive/40 bg-destructive/5 text-destructive has-checked:bg-destructive/10 has-checked:border-destructive focus-within:ring-ring relative flex aspect-square cursor-pointer items-center justify-center rounded-md border transition-colors focus-within:ring-2"
          >
            <input type="radio" name="icon" value={trimmed} defaultChecked className="sr-only" />
            <HelpCircle aria-hidden="true" className="h-5 w-5" />
            <span className="sr-only">Personalizado: {trimmed}</span>
          </label>
        ) : null}
      </div>

      {showCustom ? (
        <p className="text-muted-foreground mt-3 text-xs">
          Este curso tem o ícone personalizado <code className="text-destructive">{trimmed}</code>{' '}
          (fora da lista). Mantém-se se não escolheres outro.
        </p>
      ) : null}
    </fieldset>
  );
}
