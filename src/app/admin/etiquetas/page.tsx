import { notFound } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { createTagAction, deleteTagAction, updateTagAction } from './actions';

export const metadata = {
  title: 'Etiquetas · Área admin · LOGOS',
};

type TagRow = {
  id: string;
  slug: string;
  label: string;
  created_at: string;
};

type PageProps = {
  searchParams: Promise<{ editar?: string; apagar?: string }>;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-PT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default async function EtiquetasPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    notFound();
  }

  const { editar, apagar } = await searchParams;

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('tags')
    .select('id, slug, label, created_at')
    .order('label', { ascending: true })
    .returns<TagRow[]>();

  if (error) {
    throw new Error(`Falha a carregar etiquetas: ${error.message}`);
  }

  const tags = data ?? [];

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Etiquetas</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          As etiquetas controlam o acesso a cursos restritos. Um curso só é visível a quem tiver
          pelo menos uma das suas etiquetas. Para atribuir etiquetas a utilizadores, vai a{' '}
          <Link href="/admin/utilizadores" className="text-orange-primary hover:underline">
            Utilizadores
          </Link>
          .
        </p>
      </header>

      <section
        aria-labelledby="nova-etiqueta-heading"
        className="border-border bg-card rounded-lg border p-5"
      >
        <h2
          id="nova-etiqueta-heading"
          className="text-ink text-sm font-semibold tracking-wide uppercase"
        >
          Nova etiqueta
        </h2>
        <form
          action={async (formData: FormData) => {
            'use server';
            await createTagAction(formData);
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="block">
            <span className="text-muted-foreground text-xs font-medium">Nome visível</span>
            <input
              type="text"
              name="label"
              required
              minLength={1}
              maxLength={80}
              placeholder="Ex.: Mentoria CCLX"
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
              maxLength={64}
              placeholder="ex.: mentoria-cclx"
              className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
            />
          </label>
          <button
            type="submit"
            className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            Criar
          </button>
        </form>
      </section>

      <section aria-labelledby="lista-etiquetas-heading" className="space-y-3">
        <h2
          id="lista-etiquetas-heading"
          className="text-ink text-sm font-semibold tracking-wide uppercase"
        >
          Etiquetas existentes ({tags.length})
        </h2>
        {tags.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Ainda não há etiquetas. Cria uma no formulário acima.
          </p>
        ) : (
          <div className="border-border overflow-hidden rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-left text-xs uppercase">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Nome
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Slug
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Criada em
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {tags.map((tag) => {
                  const isEditing = editar === tag.id;
                  const isConfirmingDelete = apagar === tag.id;

                  if (isEditing) {
                    return (
                      <tr key={tag.id} className="bg-muted/20">
                        <td colSpan={4} className="px-4 py-3">
                          <form
                            action={async (formData: FormData) => {
                              'use server';
                              await updateTagAction(formData);
                            }}
                            className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end"
                          >
                            <input type="hidden" name="id" value={tag.id} />
                            <label className="block">
                              <span className="text-muted-foreground text-xs font-medium">
                                Nome
                              </span>
                              <input
                                type="text"
                                name="label"
                                required
                                defaultValue={tag.label}
                                minLength={1}
                                maxLength={80}
                                className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                              />
                            </label>
                            <label className="block">
                              <span className="text-muted-foreground text-xs font-medium">
                                Slug
                              </span>
                              <input
                                type="text"
                                name="slug"
                                required
                                defaultValue={tag.slug}
                                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                                minLength={2}
                                maxLength={64}
                                className="border-border bg-background text-ink focus-visible:ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:outline-none"
                              />
                            </label>
                            <button
                              type="submit"
                              className="bg-orange-primary hover:bg-orange-hover focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Guardar
                            </button>
                            <Link
                              href="/admin/etiquetas"
                              className="text-muted-foreground hover:text-ink focus-visible:ring-ring inline-flex h-10 items-center justify-center rounded-md px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                            >
                              Cancelar
                            </Link>
                          </form>
                        </td>
                      </tr>
                    );
                  }

                  if (isConfirmingDelete) {
                    return (
                      <tr
                        key={tag.id}
                        className="border-l-destructive bg-destructive/10 border-l-4"
                      >
                        <td colSpan={4} className="px-4 py-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-ink text-sm">
                              Apagar a etiqueta{' '}
                              <strong className="font-semibold">{tag.label}</strong> (
                              <code className="text-xs">{tag.slug}</code>)? Esta ação remove-a de
                              todos os utilizadores e não pode ser revertida.
                            </p>
                            <div className="flex gap-2">
                              <form
                                action={async (formData: FormData) => {
                                  'use server';
                                  await deleteTagAction(formData);
                                }}
                              >
                                <input type="hidden" name="id" value={tag.id} />
                                <button
                                  type="submit"
                                  className="bg-destructive hover:bg-destructive/90 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md px-3 text-xs font-medium text-white transition-colors focus-visible:ring-2 focus-visible:outline-none"
                                >
                                  Apagar definitivamente
                                </button>
                              </form>
                              <Link
                                href="/admin/etiquetas"
                                className="border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex h-9 items-center justify-center rounded-md border px-3 text-xs font-medium focus-visible:ring-2 focus-visible:outline-none"
                              >
                                Cancelar
                              </Link>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={tag.id} className="text-ink">
                      <td className="px-4 py-3 font-medium">{tag.label}</td>
                      <td className="px-4 py-3">
                        <code className="text-muted-foreground text-xs">{tag.slug}</code>
                      </td>
                      <td className="px-4 py-3 text-sm">{formatDate(tag.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          <Link
                            href={`/admin/etiquetas?editar=${tag.id}`}
                            className="text-orange-primary hover:text-orange-hover focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Editar
                          </Link>
                          <Link
                            href={`/admin/etiquetas?apagar=${tag.id}`}
                            className="text-destructive focus-visible:ring-ring rounded-md px-2 py-1 text-xs font-medium transition-colors hover:opacity-80 focus-visible:ring-2 focus-visible:outline-none"
                          >
                            Apagar
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
