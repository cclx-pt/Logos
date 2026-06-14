import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const {
  mockGetCurrentUser,
  mockInsertSingle,
  mockMaybeSingle,
  mockUpdateEq,
  mockDeleteEq,
  mockRevalidatePath,
  mockStorageUpload,
  mockStorageRemove,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockInsertSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockUpdateEq: vi.fn(),
  mockDeleteEq: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockStorageUpload: vi.fn(),
  mockStorageRemove: vi.fn(),
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
    storage: {
      from: vi.fn(() => ({
        upload: mockStorageUpload,
        remove: mockStorageRemove,
      })),
    },
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
const PREREQ_ID = '44444444-4444-4444-8444-444444444444';

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
      sequential_lessons: false,
      sequential_modules: false,
      prerequisite_course_id: null,
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

  it('grava os dois toggles de sequência de forma independente (V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockInsertSingle.mockResolvedValue({ data: { id: COURSE_ID }, error: null });

    // Só módulos sequenciais, aulas livres.
    await createCourseAction(formDataOf({ title: 'Marcos', sequential_modules: 'on' }));

    const payload = mockInsertPayload.mock.calls[0][0] as {
      sequential_lessons: boolean;
      sequential_modules: boolean;
    };
    expect(payload.sequential_lessons).toBe(false);
    expect(payload.sequential_modules).toBe(true);
  });

  it('grava prerequisite_course_id quando o curso pré-requisito existe (V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    // validatePrerequisite: lookup do candidato → existe, cadeia termina.
    mockMaybeSingle.mockResolvedValueOnce({ data: { prerequisite_course_id: null }, error: null });
    mockInsertSingle.mockResolvedValue({ data: { id: COURSE_ID }, error: null });

    const result = await createCourseAction(
      formDataOf({ title: 'Marcos', prerequisite_course_id: PREREQ_ID }),
    );

    expect(result).toEqual({ ok: true, id: COURSE_ID });
    const payload = mockInsertPayload.mock.calls[0][0] as { prerequisite_course_id: string | null };
    expect(payload.prerequisite_course_id).toBe(PREREQ_ID);
  });

  it('recusa pré-requisito que não existe (V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }); // candidato não existe

    const result = await createCourseAction(
      formDataOf({ title: 'Marcos', prerequisite_course_id: PREREQ_ID }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/não encontrado/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
  });

  it('recusa pré-requisito que não é UUID (V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));

    const result = await createCourseAction(
      formDataOf({ title: 'Marcos', prerequisite_course_id: 'xpto' }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/pré-requisito inválido/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
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
      data: { published_at: '2026-04-01T10:00:00Z', banner_storage_path: null },
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
      data: { published_at: '2026-04-01T10:00:00Z', banner_storage_path: null },
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
      data: { published_at: null, banner_storage_path: null },
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

  it('recusa o próprio curso como pré-requisito (auto-referência, V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));

    const result = await updateCourseAction(
      formDataOf({ id: COURSE_ID, title: 'Marcos', prerequisite_course_id: COURSE_ID }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/si mesmo/i) });
    expect(mockUpdatePayload).not.toHaveBeenCalled();
  });

  it('recusa pré-requisito que cria um ciclo (V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    // candidato PREREQ_ID tem como pré-requisito o próprio COURSE_ID → ciclo.
    mockMaybeSingle.mockResolvedValueOnce({
      data: { prerequisite_course_id: COURSE_ID },
      error: null,
    });

    const result = await updateCourseAction(
      formDataOf({ id: COURSE_ID, title: 'Marcos', prerequisite_course_id: PREREQ_ID }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/ciclo/i) });
    expect(mockUpdatePayload).not.toHaveBeenCalled();
  });

  it('aceita pré-requisito válido e grava prerequisite_course_id (V3.6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    // 1ª maybeSingle: validatePrerequisite (candidato existe, cadeia termina).
    // 2ª maybeSingle: lookup do curso a actualizar (published_at/banner).
    mockMaybeSingle
      .mockResolvedValueOnce({ data: { prerequisite_course_id: null }, error: null })
      .mockResolvedValueOnce({
        data: { published_at: null, banner_storage_path: null },
        error: null,
      });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await updateCourseAction(
      formDataOf({ id: COURSE_ID, title: 'Marcos', prerequisite_course_id: PREREQ_ID }),
    );

    expect(result).toEqual({ ok: true });
    const payload = mockUpdatePayload.mock.calls[0][0] as { prerequisite_course_id: string | null };
    expect(payload.prerequisite_course_id).toBe(PREREQ_ID);
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
    mockStorageRemove.mockResolvedValue({ error: null });

    const result = await deleteCourseAction(formDataOf({ id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockDeleteEq).toHaveBeenCalledWith('id', COURSE_ID);
    expect(mockStorageRemove).toHaveBeenCalledWith([`${COURSE_ID}/banner`]);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/conteudos');
    expect(mockRevalidatePath).toHaveBeenCalledWith('/conteudos');
  });
});

describe('banner uploads (V3.2 PR1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function bannerFile(bytes: number, type = 'image/jpeg'): File {
    return new File([new Uint8Array(bytes)], 'banner.jpg', { type });
  }

  function fdWith(entries: Record<string, string>, banner: File): FormData {
    const fd = formDataOf(entries);
    fd.set('banner', banner);
    return fd;
  }

  it('create: banner ausente → curso criado sem path de banner', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockInsertSingle.mockResolvedValue({ data: { id: COURSE_ID }, error: null });

    const result = await createCourseAction(formDataOf({ title: 'Marcos' }));

    expect(result).toEqual({ ok: true, id: COURSE_ID });
    expect(mockStorageUpload).not.toHaveBeenCalled();
    expect(mockUpdatePayload).not.toHaveBeenCalled();
  });

  it('create: banner JPEG válido → upload + update banner_storage_path', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockInsertSingle.mockResolvedValue({ data: { id: COURSE_ID }, error: null });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await createCourseAction(
      fdWith({ title: 'Marcos' }, bannerFile(1024, 'image/jpeg')),
    );

    expect(result).toEqual({ ok: true, id: COURSE_ID });
    expect(mockStorageUpload).toHaveBeenCalledWith(
      `${COURSE_ID}/banner`,
      expect.any(File),
      expect.objectContaining({ upsert: true, contentType: 'image/jpeg' }),
    );
    expect(mockUpdatePayload).toHaveBeenCalledWith({
      banner_storage_path: `${COURSE_ID}/banner`,
    });
  });

  it('create: banner com MIME não permitido → recusa antes de criar curso', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));

    const result = await createCourseAction(
      fdWith({ title: 'Marcos' }, bannerFile(1024, 'application/pdf')),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/jpeg.*png.*webp/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('create: banner > 5 MB → recusa antes de criar curso', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));

    const oversized = bannerFile(5 * 1024 * 1024 + 1, 'image/jpeg');
    const result = await createCourseAction(fdWith({ title: 'Marcos' }, oversized));

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/5 MB/i) });
    expect(mockInsertPayload).not.toHaveBeenCalled();
    expect(mockStorageUpload).not.toHaveBeenCalled();
  });

  it('update: remove_banner=on → banner_storage_path vira null + storage remove chamado', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { published_at: null, banner_storage_path: `${COURSE_ID}/banner` },
      error: null,
    });
    mockStorageRemove.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const result = await updateCourseAction(
      formDataOf({ id: COURSE_ID, title: 'Marcos', remove_banner: 'on' }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockStorageRemove).toHaveBeenCalledWith([`${COURSE_ID}/banner`]);
    const payload = mockUpdatePayload.mock.calls[0][0] as { banner_storage_path: string | null };
    expect(payload.banner_storage_path).toBeNull();
  });

  it('update: novo banner tem prioridade sobre remove_banner', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockMaybeSingle.mockResolvedValue({
      data: { published_at: null, banner_storage_path: `${COURSE_ID}/banner` },
      error: null,
    });
    mockStorageUpload.mockResolvedValue({ error: null });
    mockUpdateEq.mockResolvedValue({ error: null });

    const fd = formDataOf({ id: COURSE_ID, title: 'Marcos', remove_banner: 'on' });
    fd.set('banner', bannerFile(2048, 'image/webp'));
    const result = await updateCourseAction(fd);

    expect(result).toEqual({ ok: true });
    expect(mockStorageUpload).toHaveBeenCalled();
    expect(mockStorageRemove).not.toHaveBeenCalled();
    const payload = mockUpdatePayload.mock.calls[0][0] as { banner_storage_path: string | null };
    expect(payload.banner_storage_path).toBe(`${COURSE_ID}/banner`);
  });
});
