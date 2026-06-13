import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { formatDate } from '@/lib/format';
import { QUESTION_STATUS_LABEL_OWNER, type QuestionStatus } from '@/lib/questions/question';

export const metadata: Metadata = {
  title: 'As minhas conversas',
  description: 'As perguntas que fizeste às aulas e as respostas da equipa.',
};

type ThreadRow = {
  id: string;
  thread_code: string;
  course_title: string;
  lesson_title: string;
  body: string;
  status: QuestionStatus;
  updated_at: string;
};

const STATUS_BADGE: Record<QuestionStatus, string> = {
  new: 'border-orange-primary/30 bg-orange-primary/10 text-orange-primary',
  answered: 'border-border bg-accent/40 text-ink',
  archived: 'border-border bg-muted text-muted-foreground',
};

export default async function MinhasConversasPage() {
  // Guard de sessão (esta vista é pessoal). Sem sessão: entra e volta aqui.
  const user = await getCurrentUser();
  if (!user) {
    redirect('/entrar?next=/perguntas');
  }

  // Filtro explícito por profile_id (a RLS de admin vê tudo - esta vista é
  // pessoal). Ordenadas pela atividade mais recente: o trigger de status toca
  // `updated_at` a cada mensagem nova.
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('lesson_questions')
    .select('id, thread_code, course_title, lesson_title, body, status, updated_at')
    .eq('profile_id', user.id)
    .order('updated_at', { ascending: false })
    .returns<ThreadRow[]>();

  if (error) {
    throw new Error(`Falha a carregar as conversas: ${error.message}`);
  }
  const threads = data ?? [];

  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <header className="space-y-2">
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
          As minhas conversas
        </h1>
        <p className="text-muted-foreground text-sm">
          As perguntas que fizeste às aulas e as respostas da equipa.
        </p>
      </header>

      {threads.length === 0 ? (
        <div className="border-border mt-10 rounded-2xl border border-dashed px-6 py-12 text-center">
          <p className="text-ink text-sm font-medium">Ainda não fizeste perguntas.</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
            Quando tiveres uma dúvida numa aula, usa o campo de perguntas. A conversa com a equipa
            passa a aparecer aqui.
          </p>
          <Link
            href="/conteudos"
            className="text-orange-primary hover:text-orange-hover mt-4 inline-block text-sm font-medium"
          >
            Ver os conteúdos →
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/perguntas/${t.thread_code}`}
                className="border-border bg-card hover:border-orange-primary/40 focus-visible:ring-ring block rounded-2xl border p-5 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}
                  >
                    {QUESTION_STATUS_LABEL_OWNER[t.status]}
                  </span>
                  <span className="text-muted-foreground font-mono text-xs">{t.thread_code}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatDate(t.updated_at)}
                  </span>
                </div>
                <p className="text-ink mt-2 text-sm font-medium">
                  {t.course_title} › {t.lesson_title}
                </p>
                <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{t.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
