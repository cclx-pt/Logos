'use server';

/**
 * Server Actions para acesso a conteúdo de cursos.
 *
 * 1. `getLessonPdfSignedUrlAction` (PR6): gera URL assinada de 5 minutos
 *    para o PDF da aula. Delega em `signLessonPdfUrl` (`./lesson-pdf`), o
 *    núcleo partilhado também pelo route handler
 *    `GET /conteudos/[courseId]/[lessonId]/sebenta`. Mantida por estabilidade
 *    de API e testes; a UI já usa o route handler (mais robusto em mobile).
 *
 * 2. `logCourseAccessAction` (PR8): regista clique em "Começar/Continuar
 *    curso" na tabela `course_access_log`. INSERT só do próprio (RLS de
 *    PR2). Falha no insert não é fatal para o utilizador — devolvemos
 *    `{ ok: false }` mas a UI redirecciona à mesma para a aula. O
 *    objectivo é ter telemetria leve para o admin (não bloquear).
 */

import { getCurrentUser, getServerClient } from '@/lib/auth';
import { UUID_RE } from '@/lib/validation';
// Nota: NÃO re-exportar `SignedUrlResult` daqui. Este é um módulo 'use server'
// e o Turbopack trata cada export como uma Server Action em runtime - um
// re-export de tipo (apagado na compilação) rebenta o `next build`
// ("Export SignedUrlResult doesn't exist"). Quem precisar do tipo importa-o
// de `./lesson-pdf`. Aqui usamo-lo só como anotação (import type, apagado).
import { signLessonPdfUrl, type SignedUrlResult } from './lesson-pdf';

export async function getLessonPdfSignedUrlAction(lessonId: string): Promise<SignedUrlResult> {
  return signLessonPdfUrl(lessonId);
}

export type LogAccessResult = { ok: true } | { ok: false; error: string };

/**
 * Regista uma visita a uma aula em `lesson_views` (V3 pull-forward de V5).
 * Best-effort: chamada por um beacon client no mount da página de aula. Falha
 * (RLS, sessão expirada, aula inexistente) não é fatal — devolve `{ ok: false }`
 * e a página continua a funcionar. Só serve telemetria leve para o admin.
 */
export async function logLessonViewAction(lessonId: string): Promise<LogAccessResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(lessonId)) {
    return { ok: false, error: 'Aula inválida.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('lesson_views')
    .insert({ user_id: caller.id, lesson_id: lessonId });

  if (error) {
    return { ok: false, error: `Falha a registar visita: ${error.message}` };
  }
  return { ok: true };
}

export async function logCourseAccessAction(courseId: string): Promise<LogAccessResult> {
  const caller = await getCurrentUser();
  if (!caller) {
    return { ok: false, error: 'Precisas de iniciar sessão.' };
  }
  if (!UUID_RE.test(courseId)) {
    return { ok: false, error: 'Curso inválido.' };
  }

  const supabase = await getServerClient();
  const { error } = await supabase
    .from('course_access_log')
    .insert({ user_id: caller.id, course_id: courseId });

  if (error) {
    return { ok: false, error: `Falha a registar acesso: ${error.message}` };
  }
  return { ok: true };
}
