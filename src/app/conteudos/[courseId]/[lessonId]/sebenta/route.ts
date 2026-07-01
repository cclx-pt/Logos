import { UUID_RE } from '@/lib/validation';
import { signLessonPdfUrl } from '@/lib/courses/lesson-pdf';

/**
 * GET /conteudos/[courseId]/[lessonId]/sebenta
 *
 * Ponto único de acesso ao PDF da aula (sebenta), com a URL assinada gerada
 * **fresca a cada pedido**. Dois modos:
 *   - sem query: redirect para a URL inline → o iframe do visualizador na
 *     página de aula aponta para aqui. Resolve o erro intermitente em mobile
 *     (a URL embebida no HTML expirava ao fim de 5 min quando o browser
 *     recarregava o iframe) e não deixa a signed URL no HTML.
 *   - `?dl=1`: redirect para uma URL com `Content-Disposition: attachment` →
 *     o botão "Descarregar sebenta" é um `<a>` simples para aqui. Como é uma
 *     navegação real (não `window.open` depois de um await), os bloqueadores
 *     de popups em mobile deixam-na passar.
 *
 * A fronteira de segurança é a RLS (em `lessons` e `storage.objects`); este
 * handler só assina. `force-dynamic` + `no-store` garantem que nunca se serve
 * uma URL assinada em cache.
 */
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ courseId: string; lessonId: string }> };

const NO_STORE = 'no-store, max-age=0, must-revalidate';

function errorPage(message: string, status: number): Response {
  // Página mínima PT-PT em vez de deixar a resposta de erro do Supabase
  // aparecer dentro do iframe (lia como "sem permissão" ao utilizador).
  const html = `<!doctype html><html lang="pt-PT"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0;display:flex;min-height:100vh;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;color:#6b6b6b;padding:1.5rem;text-align:center;line-height:1.5">${message}</body></html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': NO_STORE },
  });
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { courseId, lessonId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(lessonId)) {
    return errorPage('Aula inválida.', 400);
  }

  const wantsDownload = new URL(request.url).searchParams.has('dl');
  // download: true → o nome do ficheiro é derivado do título da aula.
  const result = await signLessonPdfUrl(lessonId, wantsDownload ? { download: true } : undefined);

  if (!result.ok) {
    return errorPage(
      'Não foi possível abrir a sebenta. Volta a abrir a aula e tenta novamente.',
      404,
    );
  }

  return new Response(null, {
    status: 302,
    headers: { Location: result.url, 'Cache-Control': NO_STORE },
  });
}
