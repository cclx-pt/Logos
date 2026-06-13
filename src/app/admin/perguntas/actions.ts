'use server';

/**
 * Server Action de triagem da inbox de perguntas - V3.5 PR3 (dois estados, PR5).
 *
 * Muda só o `status` de uma pergunta entre `new` (Por responder) e `answered`
 * (Respondida). Responder ao aluno marca `answered` sozinho (trigger); esta
 * action cobre o fecho/reabertura manual sem escrever resposta (ex.: o aluno só
 * agradeceu). `isQuestionStatus` recusa qualquer valor fora de new/answered.
 * Defesa em profundidade:
 *   1. Esta action recusa se o caller não for admin nem super_admin.
 *   2. RLS `lesson_questions_update_status_admin` garante que o UPDATE por
 *      outro role nunca toca linhas.
 *   3. Column-scoping (`grant update (status)`) impede tocar em qualquer outra
 *      coluna, mesmo sendo admin (body/identidade/snapshots imutáveis).
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/guards';
import { UUID_RE } from '@/lib/validation';
import { isQuestionStatus } from '@/lib/questions/question';

export type SetQuestionStatusResult = { ok: true } | { ok: false; error: string };

export async function setQuestionStatusAction(
  formData: FormData,
): Promise<SetQuestionStatusResult> {
  const caller = await getCurrentUser();
  if (!caller || !isAdmin(caller.role)) {
    return { ok: false, error: 'Apenas admin ou super_admin pode gerir perguntas.' };
  }

  const questionId = formData.get('questionId');
  const status = formData.get('status');

  if (typeof questionId !== 'string' || !UUID_RE.test(questionId)) {
    return { ok: false, error: 'questionId inválido.' };
  }
  if (!isQuestionStatus(status)) {
    return { ok: false, error: 'Estado inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase.from('lesson_questions').update({ status }).eq('id', questionId);

  if (error) {
    return { ok: false, error: `Falha a atualizar a pergunta: ${error.message}` };
  }

  revalidatePath('/admin/perguntas');
  return { ok: true };
}
