import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import { createTagAction } from './actions';
import { TagsTable, type TagListItem } from './tags-table';

export const metadata = {
  title: 'Etiquetas · Área admin · LOGOS',
};

type PageProps = {
  searchParams: Promise<{ editar?: string; apagar?: string }>;
};

export default async function EtiquetasPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'super_admin') {
    notFound();
  }

  const { editar, apagar } = await searchParams;

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('tags')
    .select('id, label, created_at')
    .order('label', { ascending: true })
    .returns<TagListItem[]>();

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
            const result = await createTagAction(formData);
            redirect(
              result.ok
                ? '/admin/etiquetas?guardado=etiqueta_criada'
                : '/admin/etiquetas?erro=generico',
            );
          }}
          className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
        >
          <label className="block">
            <span className="text-muted-foreground text-xs font-medium">Nome</span>
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
          <SubmitButton pendingLabel="A criar…">Criar</SubmitButton>
        </form>
      </section>

      <section aria-labelledby="lista-etiquetas-heading" className="space-y-3">
        <h2
          id="lista-etiquetas-heading"
          className="text-ink text-sm font-semibold tracking-wide uppercase"
        >
          Etiquetas existentes ({tags.length})
        </h2>
        <TagsTable initial={tags} editingId={editar} confirmingDeleteId={apagar} />
      </section>
    </div>
  );
}
