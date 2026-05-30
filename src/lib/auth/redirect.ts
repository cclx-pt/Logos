/**
 * Validacao de caminhos de redirecionamento internos (o parametro `next`).
 *
 * Defende contra open-redirect. **Nao basta** rejeitar `//`: o parser de URL do
 * WHATWG trata `\` como `/` em esquemas especiais (http/https) e remove tabs e
 * newlines antes de parsear. Por isso `/\evil.com`, `/\/evil.com` e
 * `/<tab>/evil.com` resolvem todos para o host externo `evil.com` apesar de
 * passarem num teste ingenuo de `startsWith('//')`.
 *
 * Estrategia: so aceitamos um caminho relativo que comece por uma unica `/`,
 * sem backslashes, sem caracteres de controlo, e dentro de um limite de tamanho.
 * E o suficiente para garantir que `new URL(next, origin)` nunca escapa do origin.
 *
 * Fonte unica de verdade - usada pela Server Action de login e pelo callback OAuth.
 */

const MAX_NEXT_LENGTH = 512;

// Rejeita backslash (0x5c, tratado como '/' pelo parser) e caracteres de
// controlo C0 (< 0x20) / DEL (0x7f). Tabs e newlines sao removidos pelo parser,
// o que permitiria bypass via `/<tab>/host`.
function hasForbiddenChar(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code < 0x20 || code === 0x7f || code === 0x5c) return true;
  }
  return false;
}

export function safeNextPath(next: unknown): string | null {
  if (typeof next !== 'string' || next.length === 0) return null;
  if (next.length > MAX_NEXT_LENGTH) return null;
  if (!next.startsWith('/')) return null;
  if (next.startsWith('//')) return null;
  if (hasForbiddenChar(next)) return null;
  return next;
}
