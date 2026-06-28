import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { sendEmail } from './send';

describe('sendEmail', () => {
  beforeEach(() => {
    vi.stubEnv('RESEND_API_KEY', 're_test');
    vi.stubEnv('RESEND_FROM_EMAIL', 'Logos <no-reply@logos.cclx.pt>');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('falha (sem lançar) quando faltam as env vars', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const result = await sendEmail({ to: 'logos@cclx.pt', subject: 'x', text: 'y' });
    expect(result.ok).toBe(false);
  });

  it('faz POST ao endpoint do Resend com o payload e o Reply-To', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(null, { status: 200 }));

    const result = await sendEmail({
      to: 'logos@cclx.pt',
      subject: 'Pergunta',
      text: 'corpo',
      replyTo: 'joao@exemplo.pt',
    });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.to).toEqual(['logos@cclx.pt']);
    expect(body.reply_to).toBe('joao@exemplo.pt');
    expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer re_test' });
  });

  it('devolve erro quando o Resend responde não-2xx', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 422 }));
    const result = await sendEmail({ to: 'logos@cclx.pt', subject: 'x', text: 'y' });
    expect(result.ok).toBe(false);
  });

  it('não lança em falha de rede', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const result = await sendEmail({ to: 'logos@cclx.pt', subject: 'x', text: 'y' });
    expect(result.ok).toBe(false);
  });
});
