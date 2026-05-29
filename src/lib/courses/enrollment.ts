'use server';

/**
 * Enrollment — V3.3 PR8.
 *
 * Modelo: reusamos `course_access_log` em vez de criar tabela nova. A row
 * mais recente por (user, course) determina o estado:
 *   - existe row com `unenrolled_at IS NULL` → inscrito
 *   - existe row com `unenrolled_at` set → saiu
 *   - nenhuma row → nunca inscrito
 *
 * Re-inscrever-se insere uma nova row (mantém histórico). Progresso
 * (`lesson_completions`) sobrevive ao sair — quando o utilizador volta,
 * vê as aulas já marcadas.
 *
 * RLS:
 *   - INSERT: `course_access_log_insert_self` (V3 PR2).
 *   - UPDATE: `course_access_log_update_own` (V3.3 PR8) — só user_id próprio,
 *     usada por `unenrollAction` para set `unenrolled_at`.
 */

import { revalidatePath } from 'next/cache';

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';

export type EnrollmentState = 'anon' | 'enrolled' | 'not-enrolled';

/**
 * Devolve o conjunto de courseIds em que o utilizador actual está
 * inscrito (rows em `course_access_log` cuja mais recente tem
 * `unenrolled_at IS NULL`). Set vazio para anon.
 *
 * Usado no catálogo `/conteudos` para classificar cursos em "por
 * começar" / "em curso" na ordenação por estado.
 */
export async function getEnrolledCourseIdsForCurrentUser(): Promise<Set<string>> {
  const caller = await getCurrentUser();
  if (!caller) return new Set();

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('course_access_log')
    .select('course_id, accessed_at, unenrolled_at')
    .order('accessed_at', { ascending: false })
    .returns<{ course_id: string; accessed_at: string; unenrolled_at: string | null }[]>();

  if (error) {
    throw new Error(`Falha a carregar inscrições: ${error.message}`);
  }

  const enrolled = new Set<string>();
  const seen = new Set<string>();
  for (const row of data ?? []) {
    if (seen.has(row.course_id)) continue;
    seen.add(row.course_id);
    if (row.unenrolled_at === null) enrolled.add(row.course_id);
  }
  return enrolled;
}

/**
 * Devolve o estado actual de inscrição. Inclui o caso anónimo para a UI
 * poder decidir entre as 3 vistas (banner-only, structure-readonly, full).
 */
export async function getEnrollmentState(courseId: string): Promise<EnrollmentState> {
  const user = await getCurrentUser();
  if (!user) return 'anon';
  if (!UUID_RE.test(courseId)) return 'not-enrolled';

  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from('course_access_log')
    .select('id, unenrolled_at')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .order('accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; unenrolled_at: string | null }>();

  if (error || !data) return 'not-enrolled';
  return data.unenrolled_at === null ? 'enrolled' : 'not-enrolled';
}

export type EnrollResult = { ok: true } | { ok: false; error: string };

/**
 * Inscrever — insere row nova em `course_access_log` com
 * `unenrolled_at = NULL` (default). Idempotente: mesmo que já exista
 * inscrição activa, inserir nova row é inofensivo (apenas mais um
 * "access event" no histórico).
 */
export async function enrollAction(courseId: string): Promise<EnrollResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Precisas de iniciar sessão.' };
  if (!UUID_RE.test(courseId)) return { ok: false, error: 'Curso inválido.' };

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('course_access_log')
    .insert({ user_id: user.id, course_id: courseId });

  if (error) return { ok: false, error: `Falha a inscrever: ${error.message}` };

  revalidatePath(`/conteudos/${courseId}`);
  revalidatePath('/meus-cursos');
  return { ok: true };
}

/**
 * Sair do curso — marca `unenrolled_at = now()` na row mais recente
 * (única) com `unenrolled_at IS NULL`. Progresso preservado;
 * re-inscrever cria nova row.
 */
export async function unenrollAction(courseId: string): Promise<EnrollResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Precisas de iniciar sessão.' };
  if (!UUID_RE.test(courseId)) return { ok: false, error: 'Curso inválido.' };

  const supabase = await getServerClient();
  // Procura a row activa (unenrolled_at NULL) mais recente.
  const { data: active, error: queryError } = await supabase
    .from('course_access_log')
    .select('id')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .is('unenrolled_at', null)
    .order('accessed_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (queryError) return { ok: false, error: `Falha: ${queryError.message}` };
  if (!active) return { ok: false, error: 'Não estás inscrito neste curso.' };

  const { error } = await supabase
    .from('course_access_log')
    .update({ unenrolled_at: new Date().toISOString() })
    .eq('id', active.id);

  if (error) return { ok: false, error: `Falha a sair: ${error.message}` };

  revalidatePath(`/conteudos/${courseId}`);
  revalidatePath('/meus-cursos');
  return { ok: true };
}
