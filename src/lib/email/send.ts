/**
 * Envio de email transacional via API REST do Resend (`POST /emails`).
 *
 * Deliberadamente **sem dependência** (`resend` SDK): um `fetch` directo
 * chega e evita mais um pacote (deps são o vector de risco #1 da revisão de
 * segurança). Só servidor - `RESEND_API_KEY` não tem prefixo `NEXT_PUBLIC_`.
 *
 * Devolve um resultado em vez de lançar: quem chama decide se o envio é
 * best-effort (o caso das perguntas às aulas, em que o INSERT na BD é a fonte
 * de verdade e o email é só notificação).
 */

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export type SendEmailParams = {
  to: string;
  subject: string;
  /** Corpo em texto simples (sem HTML). */
  text: string;
  /** Reply-To opcional (ex.: o email do aluno, para a equipa responder direto). */
  replyTo?: string;
};

export type SendEmailResult = { ok: true } | { ok: false; error: string };

export async function sendEmail({
  to,
  subject,
  text,
  replyTo,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      ok: false,
      error: 'Email não configurado (RESEND_API_KEY / RESEND_FROM_EMAIL em falta).',
    };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `O Resend respondeu ${res.status}.` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Falha de rede ao contactar o Resend.' };
  }
}
