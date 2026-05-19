import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockSelect, mockEq, mockMaybeSingle, mockCreateSignedUrl } = vi.hoisted(
  () => ({
    mockGetCurrentUser: vi.fn(),
    mockSelect: vi.fn(),
    mockEq: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockCreateSignedUrl: vi.fn(),
  }),
);

type Response = { data: unknown; error: unknown };
let dbResponse: Response = { data: null, error: null };
function setDbResponse(r: Response): void {
  dbResponse = r;
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  maybeSingle: () => Promise<Response>;
};

function makeBuilder(): Builder {
  const builder: Builder = {
    select: (...args) => {
      mockSelect(...args);
      return builder;
    },
    eq: (...args) => {
      mockEq(...args);
      return builder;
    },
    maybeSingle: () => {
      mockMaybeSingle();
      return Promise.resolve(dbResponse);
    },
  };
  return builder;
}

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => makeBuilder()),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
      })),
    },
  })),
}));

import { getLessonPdfSignedUrlAction, logCourseAccessAction } from './access-actions';

function makeProfile(): Profile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role: 'user',
    createdAt: '2026-05-20T00:00:00Z',
  };
}

const VALID_LESSON_ID = '22222222-2222-4222-8222-222222222222';
const VALID_COURSE_ID = '33333333-3333-4333-8333-333333333333';

describe('getLessonPdfSignedUrlAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setDbResponse({ data: null, error: null });
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await getLessonPdfSignedUrlAction(VALID_LESSON_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/iniciar sessão/i) });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('recusa lessonId não-UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await getLessonPdfSignedUrlAction('not-a-uuid');
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/aula inválida/i) });
  });

  it('devolve erro quando a aula não é visível (RLS) — maybeSingle null', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    setDbResponse({ data: null, error: null });
    const result = await getLessonPdfSignedUrlAction(VALID_LESSON_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/sem acesso|encontrada/i) });
    expect(mockCreateSignedUrl).not.toHaveBeenCalled();
  });

  it('propaga erro do select', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    setDbResponse({ data: null, error: { message: 'boom' } });
    const result = await getLessonPdfSignedUrlAction(VALID_LESSON_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/boom/) });
  });

  it('chama createSignedUrl com 300s TTL quando aula visível', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    setDbResponse({
      data: { id: VALID_LESSON_ID, pdf_storage_path: 'c1/l1.pdf' },
      error: null,
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://signed.example/pdf' },
      error: null,
    });

    const result = await getLessonPdfSignedUrlAction(VALID_LESSON_ID);

    expect(mockCreateSignedUrl).toHaveBeenCalledWith('c1/l1.pdf', 300);
    expect(result).toEqual({ ok: true, url: 'https://signed.example/pdf' });
  });

  it('propaga erro do createSignedUrl', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    setDbResponse({
      data: { id: VALID_LESSON_ID, pdf_storage_path: 'c1/l1.pdf' },
      error: null,
    });
    mockCreateSignedUrl.mockResolvedValue({
      data: null,
      error: { message: 'storage down' },
    });

    const result = await getLessonPdfSignedUrlAction(VALID_LESSON_ID);

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/storage down/) });
  });
});

describe('logCourseAccessAction (no-op em PR6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await logCourseAccessAction(VALID_COURSE_ID);
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/iniciar sessão/i) });
  });

  it('recusa courseId não-UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await logCourseAccessAction('not-a-uuid');
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/curso inválido/i) });
  });

  it('devolve ok sem escrever na DB (stub PR6)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    const result = await logCourseAccessAction(VALID_COURSE_ID);
    expect(result).toEqual({ ok: true });
    // PR8 vai destapar o insert; aqui confirmamos que não há escrita.
    expect(mockSelect).not.toHaveBeenCalled();
  });
});
