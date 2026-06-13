'use server';

/**
 * Server Action do seguimento do aluno a uma conversa de pergunta - V3.6 PR4.
 *
 * O aluno responde DENTRO da app à sua própria conversa; a equipa é notificada
 * por email e o aluno recebe recibo (o email é o arquivo de tudo). Ordem:
 *   guarda sessão → validação (código + corpo) → resolve thread_code → INSERT em
 *   lesson_question_messages (o trigger sync_question_status_from_message repõe a
 *   pergunta em 'new', reabrindo a conversa) → emails best-effort (equipa + aluno).
 *
 * Defesa em profundidade: a RLS `lqm_insert_student_own_thread` exige
 * `author_role='student'`, autor=caller e que o thread seja dele. A resolução do
 * `thread_code` corre sob a policy SELECT-own, por isso um código de outra pessoa
 * simplesmente não resolve. O email é best-effort - a mensagem já está guardada.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getCurrentAuthEmail, getServerClient } from '@/lib/auth';
import { getServiceRoleClient } from '@/lib/auth/service-client';
import { sendEmail } from '@/lib/email/send';
import { siteConfig } from '@/lib/site-config';
import { isThreadCode, validateMessageBody } from '@/lib/questions/question';
import { buildFollowupEmail, buildFollowupReceiptEmail } from '@/lib/questions/email';

export type PostStudentFollowupResult = { ok: true } | { ok: false; error: string };

const RATE_MAX = 5;
const RATE_WINDOW_SECONDS = 3600;

/**
 * Rate-limit por utilizador via `check_rate_limit()` (service role). Chave
 * própria (`followup:`) para os seguimentos terem orçamento separado das
 * perguntas novas. Fail-open: indisponibilidade do limiter não bloqueia (mesma
 * política do login e da submissão de perguntas).
 */
async function withinRateLimit(profileId: string): Promise<boolean> {
  try {
    const svc = getServiceRoleClient();
    const { data, error } = await svc.rpc('check_rate_limit', {
      p_key: `followup:${profileId}`,
      p_max: RATE_MAX,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

export async function postStudentFollowupAction(
  formData: FormData,
): Promise<PostStudentFollowupResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Inicia sessão para responder.' };
  }

  const threadCode = formData.get('threadCode');
  if (!isThreadCode(threadCode)) {
    return { ok: false, error: 'Pedido inválido.' };
  }

  const bodyResult = validateMessageBody(formData.get('body'));
  if (!bodyResult.ok) {
    return { ok: false, error: bodyResult.error };
  }

  const supabase = await getServerClient();

  // 1) Resolve o thread_code para o id da conversa. Filtro explícito por
  // profile_id (a RLS de admin é permissiva): um código que não seja do caller
  // não resolve. A RLS de INSERT volta a exigir posse - defesa em profundidade.
  const { data: question } = await supabase
    .from('lesson_questions')
    .select('id, thread_code, course_title, lesson_title')
    .eq('thread_code', threadCode)
    .eq('profile_id', caller.id)
    .maybeSingle<{
      id: string;
      thread_code: string;
      course_title: string;
      lesson_title: string;
    }>();

  if (!question) {
    return { ok: false, error: 'Conversa não encontrada.' };
  }

  // Rate-limit depois de validar e resolver: tentativas inválidas não gastam o
  // limite.
  if (!(await withinRateLimit(caller.id))) {
    return {
      ok: false,
      error: 'Já enviaste várias mensagens há pouco. Tenta novamente daqui a um bocado.',
    };
  }

  // 2) INSERT é a fonte de verdade. A RLS força author_role='student' + autor=
  // caller + thread dele. O trigger repõe o status do cabeçalho em 'new'
  // (qualquer resposta do aluno reabre a conversa).
  const { error: insertError } = await supabase.from('lesson_question_messages').insert({
    question_id: question.id,
    author_role: 'student',
    author_profile_id: caller.id,
    author_name: caller.displayName,
    body: bodyResult.value,
  });
  if (insertError) {
    return { ok: false, error: 'Não foi possível enviar a mensagem. Tenta de novo.' };
  }

  // 3) Emails best-effort (a mensagem já está guardada; a falha não é revelada ao
  // aluno). O email é o arquivo de tudo: avisa a equipa e dá recibo ao aluno.
  const teamInbox = process.env.LOGOS_QUESTIONS_TO_EMAIL;
  const authorEmail = await getCurrentAuthEmail();
  const conversationUrl = `${siteConfig.url}/perguntas/${question.thread_code}`;

  // 3a) Aviso à equipa. Reply-To = aluno, para a equipa poder seguir por email.
  if (teamInbox) {
    const mail = buildFollowupEmail({
      authorName: caller.displayName,
      authorEmail,
      courseTitle: question.course_title,
      lessonTitle: question.lesson_title,
      body: bodyResult.value,
      threadCode: question.thread_code,
      adminUrl: `${siteConfig.url}/admin/perguntas/${question.id}`,
    });
    await sendEmail({
      to: teamInbox,
      subject: mail.subject,
      text: mail.text,
      headers: mail.headers,
      replyTo: authorEmail ?? undefined,
    });
  }

  // 3b) Recibo ao aluno do seu seguimento. Reply-To = inbox da equipa.
  if (authorEmail) {
    const receipt = buildFollowupReceiptEmail({
      authorName: caller.displayName,
      courseTitle: question.course_title,
      lessonTitle: question.lesson_title,
      body: bodyResult.value,
      threadCode: question.thread_code,
      conversationUrl,
    });
    await sendEmail({
      to: authorEmail,
      subject: receipt.subject,
      text: receipt.text,
      headers: receipt.headers,
      replyTo: teamInbox ?? undefined,
    });
  }

  revalidatePath(`/perguntas/${threadCode}`);
  revalidatePath('/perguntas');
  revalidatePath(`/admin/perguntas/${question.id}`);
  revalidatePath('/admin/perguntas');
  return { ok: true };
}

/**
 * Marca a conversa do próprio como vista (V3.6 PR5). Chamada quando o aluno abre
 * `/perguntas/[code]` (via <MarkThreadSeen>), para apagar o highlight de "não
 * lido". Delega na RPC `mark_thread_seen`, que é SECURITY DEFINER e se restringe
 * ao dono por `current_profile_id()` - um código alheio não toca linhas. Não
 * usamos service role: a RPC já confirma a posse no lado da BD e usa o `now()`
 * da BD (igual ao do trigger set_updated_at), evitando desvios de relógio.
 *
 * Best-effort e silenciosa: marcar como visto nunca pode quebrar a vista da
 * conversa. Sem revalidate - o estado do ponto/highlight actualiza no próximo
 * carregamento de página.
 */
export async function markThreadSeenAction(code: string): Promise<void> {
  const caller = await getCurrentUser();
  if (!caller || !isThreadCode(code)) return;
  try {
    const supabase = await getServerClient();
    await supabase.rpc('mark_thread_seen', { p_thread_code: code });
  } catch {
    // best-effort: marcar como visto nunca quebra a vista.
  }
}

