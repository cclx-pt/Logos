'use server';

import { getCurrentUser, getCurrentAuthEmail, getServerClient } from '@/lib/auth';
import { getServiceRoleClient } from '@/lib/auth/service-client';
import { getLessonDetailById } from '@/lib/courses/detail';
import { getEnrollmentState } from '@/lib/courses/enrollment';
import { isUuid } from '@/lib/validation';
import { sendEmail } from '@/lib/email/send';
import { siteConfig } from '@/lib/site-config';
import { validateQuestionBody } from './question';
import { buildQuestionEmail, buildQuestionReceiptEmail } from './email';

export type SubmitQuestionState =
  | { status: 'idle' }
  | { status: 'success' }
  | { status: 'error'; message: string };

const RATE_MAX = 5;
const RATE_WINDOW_SECONDS = 3600;

/**
 * Rate-limit por utilizador via `check_rate_limit()` (service role). Fail-open:
 * se o limiter estiver indisponível, não bloqueia - disponibilidade acima de
 * um controlo de baixo valor (mesma política do login).
 */
async function withinRateLimit(profileId: string): Promise<boolean> {
  try {
    const svc = getServiceRoleClient();
    const { data, error } = await svc.rpc('check_rate_limit', {
      p_key: `question:${profileId}`,
      p_max: RATE_MAX,
      p_window_seconds: RATE_WINDOW_SECONDS,
    });
    if (error) return true;
    return data === true;
  } catch {
    return true;
  }
}

/**
 * Submete uma pergunta à aula. O cliente envia só `{ lessonId, body }`;
 * identidade e contexto (curso/módulo/aula) são re-derivados no servidor.
 *
 * Ordem: validação → inscrição → rate-limit → INSERT (fonte de verdade) →
 * email best-effort. Se o email falhar, a pergunta já está guardada e aparece
 * na inbox de admin - não revelamos a falha ao aluno.
 */
export async function submitQuestionAction(
  _prev: SubmitQuestionState,
  formData: FormData,
): Promise<SubmitQuestionState> {
  const err = (message: string): SubmitQuestionState => ({ status: 'error', message });

  const lessonId = formData.get('lessonId');
  if (!isUuid(lessonId)) return err('Pedido inválido.');

  const bodyResult = validateQuestionBody(formData.get('body'));
  if (!bodyResult.ok) return err(bodyResult.error);

  const user = await getCurrentUser();
  if (!user) return err('Inicia sessão para enviar uma pergunta.');

  // Contexto re-derivado no servidor (nunca confiar em títulos do cliente).
  const lesson = await getLessonDetailById(lessonId);
  if (!lesson) return err('Aula não encontrada.');

  // Mesma porta de inscrição da página de aula (consistência de produto).
  const enrollment = await getEnrollmentState(lesson.course.id);
  if (enrollment !== 'enrolled') {
    return err('Tens de começar o curso para enviar uma pergunta.');
  }

  // Rate-limit depois da validação: tentativas inválidas não gastam o limite.
  if (!(await withinRateLimit(user.id))) {
    return err('Já enviaste várias perguntas há pouco. Tenta novamente daqui a um bocado.');
  }

  // 1) INSERT é a fonte de verdade. A RLS valida self + aula visível. O
  // .select() relê o thread_code gerado na BD (a policy SELECT-own permite-o).
  const supabase = await getServerClient();
  const { data: inserted, error: insertError } = await supabase
    .from('lesson_questions')
    .insert({
      lesson_id: lesson.id,
      profile_id: user.id,
      author_name: user.displayName,
      course_title: lesson.course.title,
      module_title: lesson.module.title,
      lesson_title: lesson.title,
      body: bodyResult.value,
    })
    .select('id, thread_code')
    .single<{ id: string; thread_code: string }>();
  if (insertError || !inserted) {
    return err('Não foi possível enviar a pergunta. Tenta de novo.');
  }

  // 2) Emails best-effort (a pergunta já está guardada; falha não é revelada ao
  // aluno). O email do aluno é lido on-demand da camada de identidade.
  const threadCode = inserted.thread_code;
  const conversationUrl = `${siteConfig.url}/perguntas/${threadCode}`;
  const adminUrl = `${siteConfig.url}/admin/perguntas/${inserted.id}`;
  const authorEmail = await getCurrentAuthEmail();

  // 2a) Notificação à equipa (inbox interna).
  const to = process.env.LOGOS_QUESTIONS_TO_EMAIL;
  if (to) {
    const mail = buildQuestionEmail({
      authorName: user.displayName,
      authorEmail,
      courseTitle: lesson.course.title,
      moduleTitle: lesson.module.title,
      lessonTitle: lesson.title,
      body: bodyResult.value,
      threadCode,
      adminUrl,
    });
    await sendEmail({
      to,
      subject: mail.subject,
      text: mail.text,
      headers: mail.headers,
      replyTo: authorEmail ?? undefined,
    });
  }

  // 2b) Cópia/confirmação ao aluno (Feature 2). Reply-To = inbox da equipa.
  if (authorEmail) {
    const receipt = buildQuestionReceiptEmail({
      authorName: user.displayName,
      courseTitle: lesson.course.title,
      moduleTitle: lesson.module.title,
      lessonTitle: lesson.title,
      body: bodyResult.value,
      threadCode,
      conversationUrl,
    });
    await sendEmail({
      to: authorEmail,
      subject: receipt.subject,
      text: receipt.text,
      headers: receipt.headers,
      replyTo: to ?? undefined,
    });
  }

  return { status: 'success' };
}
