'use server';

/**
 * Server Actions de marcação de aula como concluída.
 *
 * Toggle binário (sem percentagens, CLAUDE.md §🚫). RLS em
 * `lesson_completions` (PR2):
 *   - INSERT: `user_id = current_profile_id()` (só o próprio marca).
 *   - DELETE: `user_id = current_profile_id()` (só o próprio desmarca).
 *
 * Conclusão é acto pessoal (admin não marca por outros). Idempotente:
 * INSERT trata 23505 (PK conflict) como sucesso silencioso porque já
 * estava marcada.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';

export type CompletionResult = { ok: true } | { ok: false; error: string };

export async function markLessonCompleteAction(lessonId: string): Promise<CompletionResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(lessonId)) {
    return { ok: false, error: 'Aula inválida.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('lesson_completions')
    .insert({ user_id: caller.id, lesson_id: lessonId });

  // 23505 = duplicate key (já marcada). Tratamos como sucesso — clicar duas
  // vezes não deve falhar.
  if (error && error.code !== '23505') {
    return { ok: false, error: `Falha a marcar como concluída: ${error.message}` };
  }

  revalidatePath('/conteudos', 'layout');
  return { ok: true };
}

export async function unmarkLessonCompleteAction(lessonId: string): Promise<CompletionResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(lessonId)) {
    return { ok: false, error: 'Aula inválida.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('lesson_completions')
    .delete()
    .eq('user_id', caller.id)
    .eq('lesson_id', lessonId);

  if (error) {
    return { ok: false, error: `Falha a desmarcar: ${error.message}` };
  }

  revalidatePath('/conteudos', 'layout');
  return { ok: true };
}
