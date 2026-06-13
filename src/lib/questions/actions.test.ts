import { describe, it, expect, vi, beforeEach } from 'vitest';

import { submitQuestionAction, type SubmitQuestionState } from './actions';
import { getCurrentUser, getCurrentAuthEmail, getServerClient } from '@/lib/auth';
import { getServiceRoleClient } from '@/lib/auth/service-client';
import { getLessonDetailById } from '@/lib/courses/detail';
import { getEnrollmentState } from '@/lib/courses/enrollment';
import { sendEmail } from '@/lib/email/send';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  getCurrentAuthEmail: vi.fn(),
  getServerClient: vi.fn(),
}));
vi.mock('@/lib/auth/service-client', () => ({ getServiceRoleClient: vi.fn() }));
vi.mock('@/lib/courses/detail', () => ({ getLessonDetailById: vi.fn() }));
vi.mock('@/lib/courses/enrollment', () => ({ getEnrollmentState: vi.fn() }));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn() }));

const LESSON_ID = '11111111-1111-1111-1111-111111111111';
const PROFILE_ID = '22222222-2222-2222-2222-222222222222';
const COURSE_ID = '33333333-3333-3333-3333-333333333333';

const lessonDetail = {
  id: LESSON_ID,
  title: 'Justificação pela fé',
  description: null,
  template: 'video_pdf',
  youtube_url: 'https://youtu.be/abc',
  pdf_storage_path: 'x.pdf',
  position: 0,
  module: { id: 'm1', title: 'A Graça', position: 0 },
  course: { id: COURSE_ID, title: 'Fundamentos da Fé', icon: null },
};

let insertMock: ReturnType<typeof vi.fn>;

function formData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

const idle: SubmitQuestionState = { status: 'idle' };
const validBody = 'Tenho uma dúvida genuína sobre esta aula em particular.';

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('LOGOS_QUESTIONS_TO_EMAIL', 'logos@cclx.pt');

  vi.mocked(getCurrentUser).mockResolvedValue({
    id: PROFILE_ID,
    externalAuthId: 'ext',
    displayName: 'João Silva',
    role: 'user',
    createdAt: '2026-01-01',
  });
  vi.mocked(getCurrentAuthEmail).mockResolvedValue('joao@exemplo.pt');
  vi.mocked(getLessonDetailById).mockResolvedValue(lessonDetail as never);
  vi.mocked(getEnrollmentState).mockResolvedValue('enrolled' as never);
  vi.mocked(sendEmail).mockResolvedValue({ ok: true });

  insertMock = vi.fn().mockResolvedValue({ error: null });
  vi.mocked(getServerClient).mockResolvedValue({
    from: vi.fn(() => ({ insert: insertMock })),
  } as never);
  vi.mocked(getServiceRoleClient).mockReturnValue({
    rpc: vi.fn().mockResolvedValue({ data: true, error: null }),
  } as never);
});

describe('submitQuestionAction', () => {
  it('rejeita lessonId inválido', async () => {
    const r = await submitQuestionAction(idle, formData({ lessonId: 'nope', body: validBody }));
    expect(r.status).toBe('error');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita corpo curto de mais', async () => {
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: 'curto' }));
    expect(r.status).toBe('error');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita sem sessão', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('error');
  });

  it('rejeita quando a aula não existe', async () => {
    vi.mocked(getLessonDetailById).mockResolvedValue(null);
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('error');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejeita utilizador não inscrito (mesma porta da página)', async () => {
    vi.mocked(getEnrollmentState).mockResolvedValue('not_enrolled' as never);
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('error');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('bloqueia quando o rate-limit é excedido', async () => {
    vi.mocked(getServiceRoleClient).mockReturnValue({
      rpc: vi.fn().mockResolvedValue({ data: false, error: null }),
    } as never);
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('error');
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('insere com os snapshots de contexto e envia o email', async () => {
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('success');
    expect(insertMock).toHaveBeenCalledWith({
      lesson_id: LESSON_ID,
      profile_id: PROFILE_ID,
      author_name: 'João Silva',
      course_title: 'Fundamentos da Fé',
      module_title: 'A Graça',
      lesson_title: 'Justificação pela fé',
      body: validBody,
    });
    expect(sendEmail).toHaveBeenCalledOnce();
    const arg = vi.mocked(sendEmail).mock.calls[0][0];
    expect(arg.to).toBe('logos@cclx.pt');
    expect(arg.replyTo).toBe('joao@exemplo.pt');
  });

  it('devolve sucesso mesmo que o email falhe (insert é a fonte de verdade)', async () => {
    vi.mocked(sendEmail).mockResolvedValue({ ok: false, error: 'boom' });
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('success');
    expect(insertMock).toHaveBeenCalledOnce();
  });

  it('devolve erro quando o INSERT falha', async () => {
    insertMock.mockResolvedValue({ error: { message: 'rls' } });
    const r = await submitQuestionAction(idle, formData({ lessonId: LESSON_ID, body: validBody }));
    expect(r.status).toBe('error');
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
