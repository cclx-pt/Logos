'use server';

/**
 * Server Action da resposta do admin a uma conversa de pergunta - V3.6 PR3.
 *
 * A equipa responde DENTRO da app; a resposta vai por email ao aluno E uma
 * cópia à inbox interna (o email é o arquivo de tudo). Ordem:
 *   guarda admin → validação → INSERT em lesson_question_messages (o trigger
 *   sync_question_status_from_message põe a pergunta em 'answered') → lê o
 *   contexto do thread → emails best-effort (aluno + equipa).
 *
 * Defesa em profundidade: a action recusa quem não for admin/super_admin; a RLS
 * `lqm_insert_admin` exige `author_role='admin'` + autor=caller. O email é
 * best-effort - a mensagem já está guardada e visível na conversa.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient, getAuthEmailByProfileId } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { sendEmail } from '@/lib/email/send';
import { siteConfig } from '@/lib/site-config';
import { UUID_RE } from '@/lib/validation';
import { validateMessageBody } from '@/lib/questions/question';
import { buildAnswerEmail, buildAnswerTeamCopyEmail } from '@/lib/questions/email';

export type PostAdminReplyResult = { ok: true } | { ok: false; error: string };

export async function postAdminReplyAction(formData: FormData): Promise<PostAdminReplyResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode responder.' };
  }

  const questionId = formData.get('questionId');
  if (typeof questionId !== 'string' || !UUID_RE.test(questionId)) {
    return { ok: false, error: 'Pedido inválido.' };
  }

  const bodyResult = validateMessageBody(formData.get('body'));
  if (!bodyResult.ok) {
    return { ok: false, error: bodyResult.error };
  }

  const supabase = await getServerClient();

  // 1) INSERT é a fonte de verdade. RLS força author_role='admin' + autor=caller.
  // O trigger sincroniza lesson_questions.status para 'answered'.
  const { error: insertError } = await supabase.from('lesson_question_messages').insert({
    question_id: questionId,
    author_role: 'admin',
    author_profile_id: caller.id,
    author_name: caller.displayName,
    body: bodyResult.value,
  });
  if (insertError) {
    return { ok: false, error: 'Não foi possível enviar a resposta. Tenta de novo.' };
  }

  // 2) Email best-effort ao aluno. Lê o contexto do thread (RLS admin) para
  // compor o assunto/corpo e descobrir a quem enviar.
  const { data: question } = await supabase
    .from('lesson_questions')
    .select('profile_id, thread_code, course_title, lesson_title, body, author_name')
    .eq('id', questionId)
    .maybeSingle<{
      profile_id: string;
      thread_code: string;
      course_title: string;
      lesson_title: string;
      body: string;
      author_name: string | null;
    }>();

  if (question) {
    const conversationUrl = `${siteConfig.url}/perguntas/${question.thread_code}`;
    const teamInbox = process.env.LOGOS_QUESTIONS_TO_EMAIL;

    // 2a) Resposta ao aluno. Reply-To = inbox da equipa (rede de segurança).
    const studentEmail = await getAuthEmailByProfileId(question.profile_id);
    if (studentEmail) {
      const mail = buildAnswerEmail({
        authorName: question.author_name ?? 'aluno',
        courseTitle: question.course_title,
        lessonTitle: question.lesson_title,
        questionBody: question.body,
        answerBody: bodyResult.value,
        threadCode: question.thread_code,
        conversationUrl,
      });
      await sendEmail({
        to: studentEmail,
        subject: mail.subject,
        text: mail.text,
        headers: mail.headers,
        replyTo: teamInbox ?? undefined,
      });
    }

    // 2b) Cópia interna à equipa (o email é o arquivo de tudo). Reply-To = aluno,
    // para a equipa poder seguir por email se precisar.
    if (teamInbox) {
      const copy = buildAnswerTeamCopyEmail({
        authorName: question.author_name ?? 'aluno',
        repliedByName: caller.displayName,
        courseTitle: question.course_title,
        lessonTitle: question.lesson_title,
        answerBody: bodyResult.value,
        threadCode: question.thread_code,
        adminUrl: `${siteConfig.url}/admin/perguntas/${questionId}`,
      });
      await sendEmail({
        to: teamInbox,
        subject: copy.subject,
        text: copy.text,
        headers: copy.headers,
        replyTo: studentEmail ?? undefined,
      });
    }
  }

  revalidatePath(`/admin/perguntas/${questionId}`);
  revalidatePath('/admin/perguntas');
  return { ok: true };
}
