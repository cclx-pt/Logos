import { UUID_RE } from '@/lib/validation';
import { signLessonPdfUrl } from '@/lib/courses/lesson-pdf';

/**
 * GET /conteudos/[courseId]/[lessonId]/sebenta
 *
 * Ponto único de acesso ao PDF da aula (sebenta), com a URL assinada gerada
 * **fresca a cada pedido**. Dois modos:
 *   - sem query: redirect (302) para a URL inline → o iframe do visualizador na
 *     página de aula aponta para aqui. Resolve o erro intermitente em mobile
 *     (a URL embebida no HTML expirava ao fim de 5 min) e não deixa a signed
 *     URL no HTML.
 *   - `?dl=1`: **servimos o ficheiro nós próprios** com
 *     `Content-Disposition: attachment` → o botão "Descarregar sebenta" é um
 *     `<a>` simples para aqui. Antes fazíamos 302 para a signed URL com o
 *     parâmetro `download` do Supabase, mas os browsers tratam isso de forma
 *     inconsistente (muitos abrem o PDF inline em vez de descarregar). Servir o
 *     ficheiro com o nosso próprio cabeçalho força o download em qualquer
 *     browser. O corpo é feito stream (não bufferizamos o ficheiro todo).
 *
 * A fronteira de segurança é a RLS (em `lessons` e `storage.objects`); este
 * handler só assina/serve. `force-dynamic` + `no-store` garantem que nunca se
 * serve conteúdo em cache.
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

/**
 * Content-Disposition com nome de ficheiro (RFC 6266): `filename` em ASCII como
 * fallback + `filename*` em UTF-8 para preservar acentos nos browsers modernos.
 */
function attachmentDisposition(fileName: string): string {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request, { params }: RouteContext): Promise<Response> {
  const { courseId, lessonId } = await params;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(lessonId)) {
    return errorPage('Aula inválida.', 400);
  }

  const result = await signLessonPdfUrl(lessonId);
  if (!result.ok) {
    return errorPage(
      'Não foi possível abrir a sebenta. Volta a abrir a aula e tenta novamente.',
      404,
    );
  }

  const wantsDownload = new URL(request.url).searchParams.has('dl');

  // Visualizador inline (iframe): 302 para a signed URL, o browser mostra o PDF.
  if (!wantsDownload) {
    return new Response(null, {
      status: 302,
      headers: { Location: result.url, 'Cache-Control': NO_STORE },
    });
  }

  // Download: buscamos o ficheiro à signed URL e reenviamo-lo com o nosso
  // Content-Disposition: attachment. Stream directo do corpo (sem bufferizar).
  const upstream = await fetch(result.url);
  if (!upstream.ok || !upstream.body) {
    return errorPage(
      'Não foi possível descarregar a sebenta. Volta a abrir a aula e tenta novamente.',
      502,
    );
  }

  const headers = new Headers({
    'Content-Type': 'application/pdf',
    'Content-Disposition': attachmentDisposition(result.fileName),
    'Cache-Control': NO_STORE,
  });
  const contentLength = upstream.headers.get('content-length');
  if (contentLength) headers.set('Content-Length', contentLength);

  return new Response(upstream.body, { status: 200, headers });
}
