import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';
import { postStudentFollowupAction } from './actions';
import { getCurrentUser, getCurrentAuthEmail, getServerClient } from '@/lib/auth';
import { getServiceRoleClient } from '@/lib/auth/service-client';
import { sendEmail } from '@/lib/email/send';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAuthEmail: vi.fn(),
  getServerClient: vi.fn(),
}));
vi.mock('@/lib/auth/service-client', () => ({ getServiceRoleClient: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const PROFILE_ID = '11111111-1111-4111-8111-111111111111';
const QUESTION_ID = '22222222-2222-4222-8222-222222222222';
const THREAD = 'LOGOS-7F3AKM';

function makeProfile(role: Profile['role'] = 'user'): Profile {
  return {
    id: PROFILE_ID,
    externalAuthId: 'ext',
    displayName: 'João Silva',
    role,
    createdAt: '2026-06-13T00:00:00Z',
  };
}

function formDataOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const validBody = 'Obrigado pela resposta - mas e quanto à perseverança dos santos?';

let insertMock: ReturnType<typeof vi.fn>;
let maybeSingleMock: ReturnType<typeof vi.fn>;
let rpcMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('LOGOS_QUESTIONS_TO_EMAIL', 'logos@cclx.pt');

  insertMock = vi.fn().mockResolvedValue({ error: null });
  maybeSingleMock = vi.fn().mockResolvedValue({
    data: {
      id: QUESTION_ID,
      thread_code: THREAD,
      course_title: 'Fundamentos da Fé',
      lesson_title: 'Justificação pela fé',
    },
    error: null,
  });

  // Resolve do thread_code: .select().eq('thread_code').eq('profile_id').maybeSingle()
  const eqProfile = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
  const eqThread = vi.fn(() => ({ eq: eqProfile }));
  const selectMock = vi.fn(() => ({ eq: eqThread }));

  vi.mocked(getServerClient).mockResolvedValue({
    from: vi.fn((table: string) => {
      if (table === 'lesson_question_messages') {
        return { insert: insertMock };
      }
      // lesson_questions
      return { select: selectMock };
    }),
  } as never);

  rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
  vi.mocked(getServiceRoleClient).mockReturnValue({ rpc: rpcMock } as never);

  vi.mocked(getCurrentUser).mockResolvedValue(makeProfile('user'));
  vi.mocked(getCurrentAuthEmail).mockResolvedValue('joao@exemplo.pt');
  vi.mocked(sendEmail).mockResolvedValue({ ok: true });
});

describe('postStudentFollowupAction (V3.6 PR4)', () => {
  it('recusa quando não há sessão', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita um código de conversa malformado', async () => {
    const r = await postStudentFollowupAction(formDataOf({ threadCode: 'nope', body: validBody }));
    expect(r.ok).toBe(false);
    expect(maybeSingleMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita corpo vazio', async () => {
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: '  ' }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('devolve "não encontrada" quando o código não é do caller (RLS-own)', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('insere o seguimento com author_role=student e o caller como autor', async () => {
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(true);
    expect(insertMock).toHaveBeenCalledWith({
      question_id: QUESTION_ID,
      author_role: 'student',
      author_profile_id: PROFILE_ID,
      author_name: 'João Silva',
      body: validBody,
    });
  });

  it('respeita o rate-limit (bloqueia sem inserir)', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null });
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('é fail-open: indisponibilidade do limiter não bloqueia', async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: 'boom' } });
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(true);
    expect(insertMock).toHaveBeenCalled();
  });

  it('avisa a equipa (best-effort) com Reply-To = email do aluno', async () => {
    await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(getCurrentAuthEmail).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'logos@cclx.pt', replyTo: 'joao@exemplo.pt' }),
    );
  });

  it('não envia email quando a caixa da equipa não está configurada', async () => {
    vi.stubEnv('LOGOS_QUESTIONS_TO_EMAIL', '');
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(true);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('não bloqueia quando o envio do email falha', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: 'resend 500' });
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(true);
  });

  it('devolve erro quando o INSERT falha', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rls' } });
    const r = await postStudentFollowupAction(formDataOf({ threadCode: THREAD, body: validBody }));
    expect(r.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
