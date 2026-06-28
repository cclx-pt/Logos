import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';

import { SubmitButton } from '@/components/ui/submit-button';
import { Textarea } from '@/components/ui/textarea';
import { ConversationBubble } from '@/components/site/conversation-bubble';
import { getCurrentUser, getServerClient } from '@/lib/auth';
import {
  MESSAGE_BODY_MAX,
  QUESTION_STATUS_LABEL_OWNER,
  isThreadCode,
  type MessageAuthorRole,
  type QuestionStatus,
} from '@/lib/questions/question';
import { postStudentFollowupAction } from './actions';
import { MarkThreadSeen } from './mark-thread-seen';

export const metadata = {
  title: 'A minha conversa',
};

type QuestionRow = {
  id: string;
  thread_code: string;
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
  body: string;
  created_at: string;
};

const STATUS_BADGE: Record<QuestionStatus, string> = {
  new: 'border-orange-primary/30 bg-orange-primary/10 text-orange-primary',
  answered: 'border-border bg-accent/40 text-ink',
};

export default async function MinhaConversaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  // Guard de sessão antes de tocar na BD. O link vem por email; quem chega sem
  // sessão entra e volta aqui (next). `safeNextPath` valida o destino no /entrar.
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/entrar?next=${encodeURIComponent(`/perguntas/${code}`)}`);
  }
  // Código malformado nunca chega à BD.
  if (!isThreadCode(code)) {
    notFound();
  }

  const supabase = await getServerClient();
  const { data: question, error } = await supabase
    .from('lesson_questions')
    .select('id, thread_code, course_title, module_title, lesson_title, body, status, created_at')
    .eq('thread_code', code)
    .eq('profile_id', user.id)
    .maybeSingle<QuestionRow>();

  if (error) {
    throw new Error(`Falha a carregar a conversa: ${error.message}`);
  }
  // Filtro explícito por profile_id: a RLS de admin é permissiva (vê todas as
  // perguntas), por isso esta vista pessoal limita-se ao dono. Um código que não
  // seja do utilizador devolve nada - "não existe" e "não é tua" viram ambos 404.
  if (!question) {
    notFound();
  }

  const { data: messageData, error: messagesError } = await supabase
    .from('lesson_question_messages')
    .select('id, author_role, body, created_at')
    .eq('question_id', question.id)
    .order('created_at', { ascending: true })
    .returns<MessageRow[]>();

  if (messagesError) {
    throw new Error(`Falha a carregar as mensagens: ${messagesError.message}`);
  }
  const messages = messageData ?? [];

  return (
    <section className="mx-auto max-w-3xl space-y-6 px-4 py-12 sm:px-6 sm:py-16">
      {/* Abrir a conversa marca-a como vista (apaga o highlight de "nao lido").
          Sem UI - corre no cliente depois do render. */}
      <MarkThreadSeen code={question.thread_code} />
      <div>
        <Link
          href="/perguntas"
          className="text-muted-foreground hover:text-ink text-sm transition-colors"
        >
          ← Conversas
        </Link>
      </div>

      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[question.status]}`}
          >
            {QUESTION_STATUS_LABEL_OWNER[question.status]}
          </span>
          <span className="text-muted-foreground font-mono text-xs">{question.thread_code}</span>
        </div>
        <h1 className="font-display text-ink text-3xl font-medium tracking-tight">
          A tua pergunta
        </h1>
        <p className="text-muted-foreground text-sm">
          {question.course_title} › {question.module_title} › {question.lesson_title}
        </p>
      </header>

      {/* Pergunta de abertura + mensagens, em ordem cronológica. As tuas
          mensagens à direita; a equipa à esquerda (sempre "Equipa LOGOS", não
          expomos quem respondeu - igual à assinatura dos emails). */}
      <div className="space-y-4">
        <ConversationBubble
          align="end"
          name="Tu"
          at={question.created_at}
          body={question.body}
          label="A tua pergunta"
        />

        {messages.map((m) => (
          <ConversationBubble
            key={m.id}
            align={m.author_role === 'student' ? 'end' : 'start'}
            name={m.author_role === 'student' ? 'Tu' : 'Equipa LOGOS'}
            at={m.created_at}
            body={m.body}
          />
        ))}
      </div>

      {/* Composer do seguimento. Fica sempre disponível: qualquer mensagem do
          aluno reabre a conversa (volta a "Por responder") e avisa a equipa por
          email. */}
      <div className="border-border bg-card space-y-3 rounded-2xl border p-5">
        <h2 className="font-display text-ink text-lg font-medium">Dar seguimento</h2>
        <p className="text-muted-foreground text-xs">
          A tua mensagem fica registada aqui e a equipa é avisada por email.
        </p>
        <form
          action={async (formData: FormData) => {
            'use server';
            const result = await postStudentFollowupAction(formData);
            redirect(
              result.ok
                ? `/perguntas/${question.thread_code}?guardado=seguimento_enviado`
                : `/perguntas/${question.thread_code}?erro=generico`,
            );
          }}
          className="space-y-3"
        >
          <input type="hidden" name="threadCode" value={question.thread_code} />
          <Textarea
            name="body"
            required
            maxLength={MESSAGE_BODY_MAX}
            rows={5}
            placeholder="Escreve a tua mensagem..."
            aria-label="Mensagem de seguimento"
          />
          <SubmitButton pendingLabel="A enviar…">Enviar mensagem</SubmitButton>
        </form>
      </div>
    </section>
  );
}
