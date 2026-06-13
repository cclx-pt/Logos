import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { ConversationBubble } from '@/components/site/conversation-bubble';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import {
  MESSAGE_BODY_MAX,
  QUESTION_STATUS_LABEL,
  type MessageAuthorRole,
  type QuestionStatus,
} from '@/lib/questions/question';
import { setQuestionStatusAction } from '../actions';
import { postAdminReplyAction } from './actions';

export const metadata = {
  title: 'Conversa · Perguntas · Área admin · LOGOS',
};

type QuestionRow = {
  id: string;
  profile_id: string;
  thread_code: string;
  author_name: string | null;
  course_title: string;
  module_title: string;
  lesson_title: string;
  body: string;
  status: QuestionStatus;
  created_at: string;
};

type MessageRow = {
  id: string;
  author_role: MessageAuthorRole;
  author_name: string | null;
  body: string;
  created_at: string;
};

const STATUS_BADGE: Record<QuestionStatus, string> = {
  new: 'border-orange-primary/30 bg-orange-primary/10 text-orange-primary',
  answered: 'border-border bg-accent/40 text-ink',
  archived: 'border-border bg-muted text-muted-foreground',
};

// Transições oferecidas a partir de cada estado (alvo + rótulo do botão).
const TRANSITIONS: Record<QuestionStatus, { status: QuestionStatus; label: string }[]> = {
  new: [{ status: 'archived', label: 'Arquivar' }],
  answered: [{ status: 'archived', label: 'Arquivar' }],
  archived: [{ status: 'new', label: 'Reabrir' }],
};

export default async function PerguntaConversaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user.role)) {
    notFound();
  }

  const { id } = await params;

  const supabase = await getServerClient();
  const { data: question, error } = await supabase
    .from('lesson_questions')
    .select(
      'id, profile_id, thread_code, author_name, course_title, module_title, lesson_title, body, status, created_at',
    )
    .eq('id', id)
    .maybeSingle<QuestionRow>();

  if (error) {
    throw new Error(`Falha a carregar a conversa: ${error.message}`);
  }
  if (!question) {
    notFound();
  }

  const { data: messageData, error: messagesError } = await supabase
    .from('lesson_question_messages')
    .select('id, author_role, author_name, body, created_at')
    .eq('question_id', id)
    .order('created_at', { ascending: true })
    .returns<MessageRow[]>();

  if (messagesError) {
    throw new Error(`Falha a carregar as mensagens: ${messagesError.message}`);
  }
  const messages = messageData ?? [];

  const studentName = question.author_name ?? 'Aluno';
  const isArchived = question.status === 'archived';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/perguntas"
          className="text-muted-foreground hover:text-ink text-sm transition-colors"
        >
          ← Voltar às perguntas
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[question.status]}`}
          >
            {QUESTION_STATUS_LABEL[question.status]}
          </span>
          <span className="text-muted-foreground font-mono text-xs">{question.thread_code}</span>
        </div>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
          Conversa com {studentName}
        </h1>
        <p className="text-muted-foreground text-sm">
          {question.course_title} › {question.module_title} › {question.lesson_title}
        </p>

        <div className="flex flex-wrap gap-2">
          {TRANSITIONS[question.status].map((t) => (
            <form
              key={t.status}
              action={async (formData: FormData) => {
                'use server';
                const result = await setQuestionStatusAction(formData);
                redirect(
                  result.ok
                    ? `/admin/perguntas/${question.id}?guardado=pergunta_atualizada`
                    : `/admin/perguntas/${question.id}?erro=generico`,
                );
              }}
            >
              <input type="hidden" name="questionId" value={question.id} />
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
      </header>

      {/* Pergunta de abertura + mensagens, em ordem cronológica. */}
      <div className="space-y-4">
        <ConversationBubble
          align="start"
          name={studentName}
          at={question.created_at}
          body={question.body}
          label="Pergunta de abertura"
        />

        {messages.map((m) => (
          <ConversationBubble
            key={m.id}
            align={m.author_role === 'admin' ? 'end' : 'start'}
            name={m.author_role === 'admin' ? (m.author_name ?? 'Equipa LOGOS') : studentName}
            at={m.created_at}
            body={m.body}
          />
        ))}
      </div>

      {/* Composer - escondido quando a conversa está arquivada. */}
      {isArchived ? (
        <p className="text-muted-foreground rounded-lg border border-dashed px-4 py-6 text-center text-sm">
          Esta conversa está arquivada. Reabre-a para voltar a responder.
        </p>
      ) : (
        <section className="border-border bg-card space-y-3 rounded-2xl border p-5">
          <h2 className="font-display text-ink text-lg font-medium">Responder ao aluno</h2>
          <p className="text-muted-foreground text-xs">
            A resposta vai por email ao aluno e fica registada nesta conversa.
          </p>
          <form
            action={async (formData: FormData) => {
              'use server';
              const result = await postAdminReplyAction(formData);
              redirect(
                result.ok
                  ? `/admin/perguntas/${question.id}?guardado=resposta_enviada`
                  : `/admin/perguntas/${question.id}?erro=generico`,
              );
            }}
            className="space-y-3"
          >
            <input type="hidden" name="questionId" value={question.id} />
            <Textarea
              name="body"
              required
              maxLength={MESSAGE_BODY_MAX}
              rows={5}
              placeholder="Escreve a resposta da equipa..."
              aria-label="Resposta ao aluno"
            />
            <SubmitButton pendingLabel="A enviar…">Enviar resposta</SubmitButton>
          </form>
        </section>
      )}
    </div>
  );
}
