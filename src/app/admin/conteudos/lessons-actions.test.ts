import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

type QResp = { data: unknown; error: unknown };

const {
  mockGetCurrentUser,
  mockRevalidatePath,
  mockFrom,
  mockSelect,
  mockInsert,
  mockUpdate,
  mockDelete,
  mockEq,
  mockLt,
  mockGt,
  mockOrder,
  mockLimit,
  mockSingle,
  mockMaybeSingle,
  mockStorageRemove,
  mockStorageCreateSignedUploadUrl,
} = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockInsert: vi.fn(),
  mockUpdate: vi.fn(),
  mockDelete: vi.fn(),
  mockEq: vi.fn(),
  mockLt: vi.fn(),
  mockGt: vi.fn(),
  mockOrder: vi.fn(),
  mockLimit: vi.fn(),
  mockSingle: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockStorageRemove: vi.fn(),
  mockStorageCreateSignedUploadUrl: vi.fn(),
}));

const responseQueue: QResp[] = [];
function setQueue(...rs: QResp[]): void {
  responseQueue.length = 0;
  responseQueue.push(...rs);
}
function popQueue(): QResp {
  return responseQueue.shift() ?? { data: null, error: null };
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  insert: (...args: unknown[]) => Builder;
  update: (...args: unknown[]) => Builder;
  delete: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  lt: (...args: unknown[]) => Builder;
  gt: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  limit: (...args: unknown[]) => Builder;
  single: () => Promise<QResp>;
  maybeSingle: () => Promise<QResp>;
  then: <T>(onfulfilled: (value: QResp) => T) => Promise<T>;
};

function makeBuilder(): Builder {
  const builder: Builder = {
    select: (...args) => {
      mockSelect(...args);
      return builder;
    },
    insert: (...args) => {
      mockInsert(...args);
      return builder;
    },
    update: (...args) => {
      mockUpdate(...args);
      return builder;
    },
    delete: (...args) => {
      mockDelete(...args);
      return builder;
    },
    eq: (...args) => {
      mockEq(...args);
      return builder;
    },
    lt: (...args) => {
      mockLt(...args);
      return builder;
    },
    gt: (...args) => {
      mockGt(...args);
      return builder;
    },
    order: (...args) => {
      mockOrder(...args);
      return builder;
    },
    limit: (...args) => {
      mockLimit(...args);
      return builder;
    },
    single: () => {
      mockSingle();
      return Promise.resolve(popQueue());
    },
    maybeSingle: () => {
      mockMaybeSingle();
      return Promise.resolve(popQueue());
    },
    then: (onfulfilled) => Promise.resolve(popQueue()).then(onfulfilled),
  };
  return builder;
}

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return makeBuilder();
    },
    storage: {
      from: () => ({
        remove: mockStorageRemove,
        createSignedUploadUrl: mockStorageCreateSignedUploadUrl,
      }),
    },
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import {
  createLessonAction,
  createLessonPdfUploadUrlAction,
  updateLessonAction,
  deleteLessonAction,
  moveLessonUpAction,
} from './lessons-actions';

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
const MODULE_ID = '33333333-3333-4333-8333-333333333333';
const LESSON_ID = '44444444-4444-4444-8444-444444444444';
const NEIGHBOR_ID = '55555555-5555-4555-8555-555555555555';
const OTHER_MODULE_ID = '66666666-6666-4666-8666-666666666666';

// Caminhos de Storage válidos: `<courseId>/<uuid>.pdf`. O nome é aleatório
// (gerado ao assinar o upload), por isso usamos uuids fixos nos testes.
const PDF_PATH = `${COURSE_ID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf`;
const NEW_PDF_PATH = `${COURSE_ID}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.pdf`;
const FOREIGN_PDF_PATH =
  '99999999-9999-4999-8999-999999999999/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.pdf';

function formDataOf(entries: Record<string, string | File>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

const BASE_FIELDS = {
  course_id: COURSE_ID,
  module_id: MODULE_ID,
  title: 'O Reino de Deus',
  template: 'pdf',
};

describe('createLessonPdfUploadUrlAction (V3.7 upload directo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await createLessonPdfUploadUrlAction(COURSE_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockStorageCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('recusa courseId inválido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonPdfUploadUrlAction('nao-e-uuid');
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/course_id/i) });
    expect(mockStorageCreateSignedUploadUrl).not.toHaveBeenCalled();
  });

  it('assina upload para um path <courseId>/<uuid>.pdf e devolve path + token', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockStorageCreateSignedUploadUrl.mockResolvedValue({
      data: { path: PDF_PATH, token: 'tok-123', signedUrl: 'https://x/upload' },
      error: null,
    });

    const result = await createLessonPdfUploadUrlAction(COURSE_ID);

    expect(result).toEqual({ ok: true, path: PDF_PATH, token: 'tok-123' });
    expect(mockStorageCreateSignedUploadUrl).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${COURSE_ID}/[0-9a-f-]{36}\\.pdf$`)),
    );
  });

  it('propaga erro do Storage ao assinar', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockStorageCreateSignedUploadUrl.mockResolvedValue({
      data: null,
      error: { message: 'bucket down' },
    });
    const result = await createLessonPdfUploadUrlAction(COURSE_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/bucket down/i) });
  });
});

describe('createLessonAction (V3.7 upload directo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, pdf_storage_path: PDF_PATH }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa template inválido', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, template: 'quiz', pdf_storage_path: PDF_PATH }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/template/i) });
  });

  it('recusa video_pdf sem youtube_url', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, template: 'video_pdf', pdf_storage_path: PDF_PATH }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/youtube/i) });
  });

  it('recusa URL do YouTube fora do formato esperado', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonAction(
      formDataOf({
        ...BASE_FIELDS,
        template: 'video_pdf',
        youtube_url: 'https://vimeo.com/12345',
        pdf_storage_path: PDF_PATH,
      }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/youtube/i) });
  });

  it('recusa quando o path do PDF está em falta', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonAction(formDataOf(BASE_FIELDS));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/pdf/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa path do PDF com prefixo de outro curso', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, pdf_storage_path: FOREIGN_PDF_PATH }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/inválido/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('happy path: insert com o path real + revalida (sem upload na action)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: null, error: null }, // max query empty → position 0
      { data: { id: LESSON_ID }, error: null }, // insert
    );

    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, pdf_storage_path: PDF_PATH }),
    );

    expect(result).toEqual({ ok: true, id: LESSON_ID });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        module_id: MODULE_ID,
        title: 'O Reino de Deus',
        template: 'pdf',
        youtube_url: null,
        pdf_storage_path: PDF_PATH,
        position: 0,
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/conteudos/${COURSE_ID}/${MODULE_ID}`);
  });

  it('remove o ficheiro já enviado se o insert falhar', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: null, error: null }, // max
      { data: null, error: { message: 'insert boom' } }, // insert falha
    );
    mockStorageRemove.mockResolvedValue({ data: [], error: null });

    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, pdf_storage_path: PDF_PATH }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/insert boom/i) });
    expect(mockStorageRemove).toHaveBeenCalledWith([PDF_PATH]);
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it('recusa template video sem youtube_url', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createLessonAction(formDataOf({ ...BASE_FIELDS, template: 'video' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/youtube/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('aula só-vídeo (video): insert directo com pdf null, sem path nem remove', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: null, error: null }, // max query empty → position 0
      { data: { id: LESSON_ID }, error: null }, // insert
    );

    const result = await createLessonAction(
      formDataOf({ ...BASE_FIELDS, template: 'video', youtube_url: 'https://youtu.be/abcdef' }),
    );

    expect(result).toEqual({ ok: true, id: LESSON_ID });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'video',
        youtube_url: 'https://youtu.be/abcdef',
        pdf_storage_path: null,
        position: 0,
      }),
    );
    expect(mockStorageRemove).not.toHaveBeenCalled();
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/conteudos/${COURSE_ID}/${MODULE_ID}`);
  });
});

describe('updateLessonAction (V3.7 upload directo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa caller user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await updateLessonAction(formDataOf({ ...BASE_FIELDS, id: LESSON_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
  });

  it('coerência: pdf → video_pdf sem youtube_url rejeita', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await updateLessonAction(
      formDataOf({ ...BASE_FIELDS, id: LESSON_ID, template: 'video_pdf' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/youtube/i) });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('coerência: video_pdf → pdf limpa youtube_url (mantém PDF actual)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      // 1ª: lookup do pdf_storage_path actual
      { data: { pdf_storage_path: PDF_PATH }, error: null },
      // 2ª: update final
      { data: null, error: null },
    );

    const result = await updateLessonAction(
      formDataOf({ ...BASE_FIELDS, id: LESSON_ID, template: 'pdf' }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'pdf',
        youtube_url: null,
        pdf_storage_path: PDF_PATH,
      }),
    );
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });

  it('com novo PDF anexado: usa o novo path e remove o antigo', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockStorageRemove.mockResolvedValue({ data: [], error: null });
    setQueue(
      { data: { pdf_storage_path: PDF_PATH }, error: null }, // lookup actual
      { data: null, error: null }, // update final
    );

    const result = await updateLessonAction(
      formDataOf({ ...BASE_FIELDS, id: LESSON_ID, pdf_storage_path: NEW_PDF_PATH }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ pdf_storage_path: NEW_PDF_PATH }),
    );
    expect(mockStorageRemove).toHaveBeenCalledWith([PDF_PATH]);
  });

  it('recusa novo path com prefixo de outro curso', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue({ data: { pdf_storage_path: PDF_PATH }, error: null }); // lookup actual

    const result = await updateLessonAction(
      formDataOf({ ...BASE_FIELDS, id: LESSON_ID, pdf_storage_path: FOREIGN_PDF_PATH }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/inválido/i) });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('coerência: muda para video limpa pdf_storage_path e remove o ficheiro', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    mockStorageRemove.mockResolvedValue({ data: [], error: null });
    setQueue(
      { data: { pdf_storage_path: PDF_PATH }, error: null }, // lookup actual
      { data: null, error: null }, // update final
    );

    const result = await updateLessonAction(
      formDataOf({
        ...BASE_FIELDS,
        id: LESSON_ID,
        template: 'video',
        youtube_url: 'https://youtu.be/abcdef',
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        template: 'video',
        youtube_url: 'https://youtu.be/abcdef',
        pdf_storage_path: null,
      }),
    );
    expect(mockStorageRemove).toHaveBeenCalledWith([PDF_PATH]);
  });
});

describe('deleteLessonAction (V3.7 upload directo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('apaga DB + remove o ficheiro guardado no path + revalida', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { pdf_storage_path: PDF_PATH }, error: null }, // lookup do path
      { data: null, error: null }, // delete
    );
    mockStorageRemove.mockResolvedValue({ data: [], error: null });

    const result = await deleteLessonAction(
      formDataOf({ id: LESSON_ID, course_id: COURSE_ID, module_id: MODULE_ID }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockStorageRemove).toHaveBeenCalledWith([PDF_PATH]);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/conteudos/${COURSE_ID}/${MODULE_ID}`);
  });

  it('aula só-vídeo (sem path): apaga DB sem chamar remove', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { pdf_storage_path: null }, error: null }, // lookup do path
      { data: null, error: null }, // delete
    );

    const result = await deleteLessonAction(
      formDataOf({ id: LESSON_ID, course_id: COURSE_ID, module_id: MODULE_ID }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockStorageRemove).not.toHaveBeenCalled();
  });
});

describe('moveLessonUpAction (V3 PR4b)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('swap com vizinho acima', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { id: LESSON_ID, position: 2, module_id: MODULE_ID }, error: null },
      { data: { id: NEIGHBOR_ID, position: 1 }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const result = await moveLessonUpAction(
      formDataOf({ id: LESSON_ID, course_id: COURSE_ID, module_id: MODULE_ID }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { position: 1 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { position: 2 });
    expect(mockLt).toHaveBeenCalledWith('position', 2);
  });

  it('no-op quando já é a primeira aula', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { id: LESSON_ID, position: 0, module_id: MODULE_ID }, error: null },
      { data: null, error: null },
    );

    const result = await moveLessonUpAction(
      formDataOf({ id: LESSON_ID, course_id: COURSE_ID, module_id: MODULE_ID }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('rejeita quando module_id do FormData não bate com o da aula', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue({
      data: { id: LESSON_ID, position: 1, module_id: OTHER_MODULE_ID },
      error: null,
    });

    const result = await moveLessonUpAction(
      formDataOf({ id: LESSON_ID, course_id: COURSE_ID, module_id: MODULE_ID }),
    );

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/não pertence/i) });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
