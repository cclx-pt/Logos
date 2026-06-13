import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';
import { postAdminReplyAction } from './actions';
import {
  getCurrentUser,
  getServerClient,
  getAuthEmailByProfileId,
} from '@/lib/auth';
import { sendEmail } from '@/lib/email/send';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  getServerClient: vi.fn(),
  getAuthEmailByProfileId: vi.fn(),
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const STUDENT_ID = '33333333-3333-4333-8333-333333333333';

function makeProfile(role: Profile['role']): Profile {
  return {
    id: PROFILE_ID,
    externalAuthId: 'ext',
    displayName: 'Admin Ana',
    role,
    createdAt: '2026-06-13T00:00:00Z',
  };
}

function formDataOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const validBody = 'Boa pergunta - a justificação é o acto e a santificação o processo.';

let insertMock: ReturnType<typeof vi.fn>;
let maybeSingleMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('LOGOS_QUESTIONS_TO_EMAIL', 'logos@cclx.pt');

  insertMock = vi.fn().mockResolvedValue({ error: null });
  maybeSingleMock = vi.fn().mockResolvedValue({
    data: {
      profile_id: STUDENT_ID,
      thread_code: 'LOGOS-7F3AKM',
      course_title: 'Fundamentos da Fé',
      lesson_title: 'Justificação pela fé',
      body: 'A minha dúvida original.',
      author_name: 'João Silva',
    },
    error: null,
  });

  vi.mocked(getServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'lesson_question_messages') {
        return { insert: insertMock };
      }
      // lesson_questions
      return {
        select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })) })),
      };
    }),
  } as never);

  vi.mocked(getCurrentUser).mockResolvedValue(makeProfile('admin'));
  vi.mocked(getAuthEmailByProfileId).mockResolvedValue('joao@exemplo.pt');
  vi.mocked(sendEmail).mockResolvedValue({ ok: true });
});

describe('postAdminReplyAction (V3.6 PR3)', () => {
  it('recusa quando não há sessão', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('recusa um utilizador normal (regra dura)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(makeProfile('user'));
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita questionId inválido', async () => {
    const r = await postAdminReplyAction(formDataOf({ questionId: 'nope', body: validBody }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita corpo vazio', async () => {
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: ' ' }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('insere a mensagem com author_role=admin e o caller como autor', async () => {
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(r.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledWith({
      question_id: QUESTION_ID,
      author_role: 'admin',
      author_profile_id: PROFILE_ID,
      author_name: 'Admin Ana',
      body: validBody,
    });
  });

  it('envia o email ao aluno (best-effort) com o email lido por profile_id', async () => {
    await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(getAuthEmailByProfileId).toHaveBeenCalledWith(STUDENT_ID);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'joao@exemplo.pt', replyTo: 'logos@cclx.pt' }),
    );
  });

  it('sem email do aluno não bloqueia (mas a cópia à equipa segue)', async () => {
    vi.mocked(getAuthEmailByProfileId).mockResolvedValue(null);
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(r.ok).toBe(true);
    // sem resposta ao aluno (email desconhecido), mas a cópia interna à equipa segue na mesma
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: 'logos@cclx.pt' }));
    expect(sendEmail).not.toHaveBeenCalledWith(
      expect.objectContaining({ to: 'joao@exemplo.pt' }),
    );
  });

  it('não bloqueia quando o envio do email falha', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: 'resend 500' });
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(r.ok).toBe(true);
  });

  it('devolve erro quando o INSERT falha', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rls' } });
    const r = await postAdminReplyAction(formDataOf({ questionId: QUESTION_ID, body: validBody }));
    expect(r.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
