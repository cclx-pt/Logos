import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const {
  mockGetCurrentUser,
  mockInsertSingle,
  mockMaybeSingle,
  mockUpdateEq,
  mockDeleteEq,
  mockRevalidatePath,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockInsertSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockDeleteEq: vi.fn(),
  mockRevalidatePath: vi.fn(),
}));

const mockInsertPayload = vi.fn();
const mockUpdatePayload = vi.fn();

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      insert: (payload: unknown) => {
        mockInsertPayload(payload);
        return {
          select: vi.fn(() => ({ single: mockInsertSingle })),
        };
      },
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mockMaybeSingle })),
      })),
      update: (payload: unknown) => {
        mockUpdatePayload(payload);
        return { eq: mockUpdateEq };
      },
      delete: vi.fn(() => ({ eq: mockDeleteEq })),
    })),
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { createCourseAction, updateCourseAction, deleteCourseAction } from './courses-actions';

function makeProfile(role: Profile['role'], id: string): Profile {
  return {
    id,
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role,
    createdAt: '2026-05-14T00:00:00Z',
  };
}

const CALLER_ID = '11111111-1111-4111-8111-111111111111';
const COURSE_ID = '22222222-2222-4222-8222-222222222222';
const TAG_ID = '33333333-3333-4333-8333-333333333333';

function formDataOf(
  entries: Record<string, string>,
  multi: Record<string, string[]> = {},
): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  for (const [k, values] of Object.entries(multi)) {
    for (const v of values) fd.append(k, v);
  }
  return fd;
}

describe('createCourseAction (V3 PR3 + V3.1 sem slug)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await createCourseAction(formDataOf({ title: 'Marcos' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await createCourseAction(formDataOf({ title: 'Marcos' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
  });

  it('recusa título vazio', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createCourseAction(formDataOf({ title: '   ' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/título/i) });
  });

  it('recusa required_tags com valor que não é UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createCourseAction(
      formDataOf({ title: 'Marcos' }, { required_tags: ['not-a-uuid'] }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/required_tags/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
  });

  it('cria curso como rascunho quando "published" não está marcado', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockInsertSingle.mockResolvedValue({ data: { id: COURSE_ID }, error: null });

    const result = await createCourseAction(
      formDataOf(
        { title: 'Marcos', description: 'Curso intro', icon: 'book-open' },
        { required_tags: [TAG_ID] },
      ),
    );

    expect(result).toEqual({ ok: true, id: COURSE_ID });
    expect(mockInsertPayload).toHaveBeenCalledWith({
      title: 'Marcos',
      description: 'Curso intro',
      icon: 'book-open',
      required_tags: [TAG_ID],
      published_at: null,
      created_by: CALLER_ID,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/conteudos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/conteudos');
  });

  it('cria curso publicado com published_at definido quando toggle on', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    mockInsertSingle.mockResolvedValue({ data: { id: COURSE_ID }, error: null });

    const result = await createCourseAction(formDataOf({ title: 'Marcos', published: 'on' }));

    expect(result).toEqual({ ok: true, id: COURSE_ID });
    const payload = mockInsertPayload.mock.calls[0][0] as { published_at: string | null };
    expect(payload.published_at).toEqual(expect.stringMatching(/T.*Z$/));
  });

  it('propaga erro genérico do Supabase em insert', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockInsertSingle.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'permission denied for relation courses' },
    });

    const result = await createCourseAction(formDataOf({ title: 'Marcos' }));

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/falha a criar/i) });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateCourseAction (V3 PR3 + V3.1 sem slug)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await updateCourseAction(formDataOf({ id: COURSE_ID, title: 'Marcos' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockUpdatePayload).not.toHaveBeenCalled();
  });

  it('recusa quando id não é UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await updateCourseAction(formDataOf({ id: 'not-uuid', title: 'Marcos' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/id/i) });
  });

  it('preserva published_at original quando o curso já estava publicado e toggle continua on', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { published_at: '2026-04-01T10:00:00Z' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await updateCourseAction(
      formDataOf({ id: COURSE_ID, title: 'Marcos', published: 'on' }),
    );

    expect(result).toEqual({ ok: true });
    const payload = mockUpdatePayload.mock.calls[0][0] as { published_at: string | null };
    expect(payload.published_at).toBe('2026-04-01T10:00:00Z');
  });

  it('despublica (toggle off) → published_at = null', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { published_at: '2026-04-01T10:00:00Z' },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await updateCourseAction(formDataOf({ id: COURSE_ID, title: 'Marcos' }));

    expect(result).toEqual({ ok: true });
    const payload = mockUpdatePayload.mock.calls[0][0] as { published_at: string | null };
    expect(payload.published_at).toBeNull();
  });

  it('publica pela primeira vez (era null, toggle on) → published_at preenchido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { published_at: null },
      error: null,
    });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await updateCourseAction(
      formDataOf({ id: COURSE_ID, title: 'Marcos', published: 'on' }),
    );

    expect(result).toEqual({ ok: true });
    const payload = mockUpdatePayload.mock.calls[0][0] as { published_at: string | null };
    expect(payload.published_at).toEqual(expect.stringMatching(/T.*Z$/));
  });

  it('recusa quando curso não existe', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await updateCourseAction(formDataOf({ id: COURSE_ID, title: 'Marcos' }));

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/não encontrado/i) });
    expect(mockUpdatePayload).not.toHaveBeenCalled();
  });
});

describe('deleteCourseAction (V3 PR3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await deleteCourseAction(formDataOf({ id: COURSE_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockDeleteEq).not.toHaveBeenCalled();
  });

  it('apaga e revalida quando válida (admin)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockDeleteEq.mockResolvedValue({ error: null });

    const result = await deleteCourseAction(formDataOf({ id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockDeleteEq).toHaveBeenCalledWith('id', COURSE_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/conteudos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/conteudos');
  });
});
