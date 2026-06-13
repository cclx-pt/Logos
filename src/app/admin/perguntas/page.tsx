import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { ListSearch } from '@/components/admin/list-search';
import { SubmitButton } from '@/components/ui/submit-button';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { formatDate } from '@/lib/format';
import {
  QUESTION_STATUS_LABEL,
  isQuestionStatus,
  type QuestionStatus,
} from '@/lib/questions/question';
import { setQuestionStatusAction } from './actions';

export const metadata = {
  title: 'Perguntas · Área admin · LOGOS',
};

type QuestionRow = {
  id: string;
  author_name: string | null;
  course_title: string;
  module_title: string;
  lesson_title: string;
  body: string;
  status: QuestionStatus;
  created_at: string;
};

const STATUS_BADGE: Record<QuestionStatus, string> = {
  new: 'border-orange-primary/30 bg-orange-primary/10 text-orange-primary',
  answered: 'border-border bg-accent/40 text-ink',
  archived: 'border-border bg-muted text-muted-foreground',
};

// Transições oferecidas a partir de cada estado (alvo + rótulos do botão).
const TRANSITIONS: Record<QuestionStatus, { status: QuestionStatus; label: string }[]> = {
  new: [
    { status: 'answered', label: 'Marcar como respondida' },
    { status: 'archived', label: 'Arquivar' },
  ],
  answered: [
    { status: 'archived', label: 'Arquivar' },
    { status: 'new', label: 'Reabrir' },
  ],
  archived: [{ status: 'new', label: 'Reabrir' }],
};

export default async function PerguntasPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const { estado } = await searchParams;
  const activeFilter: QuestionStatus | 'all' = isQuestionStatus(estado) ? estado : 'all';
  const backTo =
    activeFilter === 'all' ? '/admin/perguntas' : `/admin/perguntas?estado=${activeFilter}`;
  const sep = backTo.includes('?') ? '&' : '?';

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('lesson_questions')
    .select('id, author_name, course_title, module_title, lesson_title, body, status, created_at')
    .order('created_at', { ascending: false })
    .returns<QuestionRow[]>();

  if (error) {
    throw new Error(`Falha a carregar perguntas: ${error.message}`);
  }

  const all = data ?? [];
  const counts = { all: all.length, new: 0, answered: 0, archived: 0 };
  for (const q of all) counts[q.status]++;
  const questions = activeFilter === 'all' ? all : all.filter((q) => q.status === activeFilter);

  const tabs: { key: QuestionStatus | 'all'; label: string; href: string; count: number }[] = [
    { key: 'all', label: 'Todas', href: '/admin/perguntas', count: counts.all },
    { key: 'new', label: 'Novas', href: '/admin/perguntas?estado=new', count: counts.new },
    {
      key: 'answered',
      label: 'Respondidas',
      href: '/admin/perguntas?estado=answered',
      count: counts.answered,
    },
    {
      key: 'archived',
      label: 'Arquivadas',
      href: '/admin/perguntas?estado=archived',
      count: counts.archived,
    },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">Perguntas</h1>
        <p className="text-muted-foreground mt-2 max-w-prose text-sm">
          Perguntas dos alunos às aulas. Abre uma conversa para responder dentro da Logos - a
          resposta vai por email ao aluno e fica registada aqui. Cada pergunta chega também a{' '}
          <strong className="font-medium">logos@cclx.pt</strong> como aviso.
        </p>
      </header>

      <nav aria-label="Filtrar por estado" className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const active = tab.key === activeFilter;
          return (
            <Link
              key={tab.key}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? 'border-orange-primary/40 bg-orange-primary/10 text-orange-primary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium'
                  : 'border-border text-ink hover:bg-muted/40 focus-visible:ring-ring inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none'
              }
            >
              {tab.label}
              <span className="text-muted-foreground text-xs">{tab.count}</span>
            </Link>
          );
        })}
      </nav>

      {questions.length === 0 ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-8 text-center text-sm">
          {activeFilter === 'all' ? 'Ainda não há perguntas.' : 'Nenhuma pergunta neste estado.'}
        </p>
      ) : (
        <ListSearch
          label="Pesquisar pergunta"
          placeholder="Pesquisar por aluno, curso, aula ou texto..."
        >
          <div className="space-y-4">
            {questions.map((q) => (
              <article
                key={q.id}
                data-search-text={`${q.author_name ?? ''} ${q.course_title} ${q.module_title} ${q.lesson_title} ${q.body}`.toLowerCase()}
                className="border-border bg-card rounded-2xl border p-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[q.status]}`}
                    >
                      {QUESTION_STATUS_LABEL[q.status]}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {formatDate(q.created_at)}
                    </span>
                  </div>
                  <span className="text-ink text-sm font-medium">{q.author_name ?? 'Aluno'}</span>
                </div>

                <p className="text-muted-foreground mt-3 text-xs">
                  {q.course_title} › {q.module_title} › {q.lesson_title}
                </p>

                <p className="text-ink mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                  {q.body}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/perguntas/${q.id}`}
                    className="border-orange-primary/30 text-orange-primary hover:bg-orange-primary/10 focus-visible:ring-ring inline-flex h-9 items-center rounded-md border px-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  >
                    Ver conversa →
                  </Link>
                  {TRANSITIONS[q.status].map((t) => (
                    <form
                      key={t.status}
                      action={async (formData: FormData) => {
                        'use server';
                        const result = await setQuestionStatusAction(formData);
                        redirect(
                          result.ok
                            ? `${backTo}${sep}guardado=pergunta_atualizada`
                            : `${backTo}${sep}erro=generico`,
                        );
                      }}
                    >
                      <input type="hidden" name="questionId" value={q.id} />
                      <input type="hidden" name="status" value={t.status} />
                      <SubmitButton
                        pendingLabel="A guardar…"
                        className="border-border text-ink hover:bg-muted/40 h-9 rounded-md border bg-transparent px-3 text-xs font-medium"
                      >
                        {t.label}
                      </SubmitButton>
                    </form>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </ListSearch>
      )}
    </div>
  );
}
