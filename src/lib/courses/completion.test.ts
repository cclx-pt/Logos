import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { Profile } from '@/lib/auth';

const { mockGetCurrentUser, mockSelect, mockIn, mockEq, mockReturns, mockMaybeSingle, mockInsert } =
  vi.hoisted(() => ({
    mockGetCurrentUser: vi.fn(),
    mockSelect: vi.fn(),
    mockIn: vi.fn(),
    mockEq: vi.fn(),
    mockReturns: vi.fn(),
    mockMaybeSingle: vi.fn(),
    mockInsert: vi.fn(),
  }));

type Response = { data: unknown; error: unknown };
let response: Response = { data: [], error: null };

function setResponse(r: Response): void {
  response = r;
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  in: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  returns: () => Promise<Response>;
  // maybeSingle e insert delegam directamente para mocks vi.fn — assim os
  // testes podem usar mockResolvedValueOnce() para sequenciar respostas
  // (necessário para o teste de race condition do getOrCreateCourseCompletion,
  // onde select → null, insert → 23505, refetch → row encontrado).
  maybeSingle: () => Promise<Response>;
  insert: (row: unknown) => Builder;
};

function makeBuilder(): Builder {
  const builder: Builder = {
    select: (...args) => {
      mockSelect(...args);
      return builder;
    },
    in: (...args) => {
      mockIn(...args);
      return builder;
    },
    eq: (...args) => {
      mockEq(...args);
      return builder;
    },
    returns: () => {
      mockReturns();
      return Promise.resolve(response);
    },
    maybeSingle: () => mockMaybeSingle() as Promise<Response>,
    insert: (row) => {
      mockInsert(row);
      return builder;
    },
  };
  return builder;
}

vi.mock('@/lib/auth', () => ({
  getCurrentUser: mockGetCurrentUser,
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => makeBuilder()),
  })),
}));

import {
  getCompletedLessonIds,
  getNextModuleWithLessons,
  getOrCreateCourseCompletion,
  isCourseComplete,
  isModuleComplete,
} from './completion';
import type { CourseDetail, ModuleWithLessons } from './detail';

function makeProfile(): Profile {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    externalAuthId: 'auth-uid',
    displayName: 'João',
    role: 'user',
    createdAt: '2026-05-20T00:00:00Z',
  };
}

function makeModule(id: string, lessonIds: string[]): ModuleWithLessons {
  return {
    id,
    title: `Módulo ${id}`,
    description: null,
    position: 0,
    lessons: lessonIds.map((lid, i) => ({
      id: lid,
      title: `Aula ${lid}`,
      description: null,
      template: 'pdf' as const,
      position: i,
    })),
  };
}

function makeCourse(modules: ModuleWithLessons[]): CourseDetail {
  return {
    id: 'c1',
    slug: 'curso',
    title: 'Curso',
    description: null,
    icon: null,
    modules: modules.map((m, i) => ({ ...m, position: i })),
  };
}

describe('getCompletedLessonIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: [], error: null });
  });

  it('devolve set vazio quando lessonIds é vazio (short-circuit)', async () => {
    const result = await getCompletedLessonIds([]);
    expect(result.size).toBe(0);
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('devolve set vazio quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await getCompletedLessonIds(['l1']);
    expect(result.size).toBe(0);
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it('lança Error quando supabase devolve error', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    setResponse({ data: null, error: { message: 'boom' } });
    await expect(getCompletedLessonIds(['l1'])).rejects.toThrow(/boom/);
  });

  it('mapeia rows para Set de lesson_id', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    setResponse({
      data: [{ lesson_id: 'l1' }, { lesson_id: 'l3' }],
      error: null,
    });
    const result = await getCompletedLessonIds(['l1', 'l2', 'l3']);
    expect(result.has('l1')).toBe(true);
    expect(result.has('l2')).toBe(false);
    expect(result.has('l3')).toBe(true);
    expect(result.size).toBe(2);
  });
});

describe('isModuleComplete', () => {
  it('é false quando o módulo não tem aulas', () => {
    expect(isModuleComplete(makeModule('m1', []), new Set())).toBe(false);
  });

  it('é false quando falta pelo menos uma aula', () => {
    expect(isModuleComplete(makeModule('m1', ['l1', 'l2']), new Set(['l1']))).toBe(false);
  });

  it('é true quando todas as aulas estão concluídas', () => {
    expect(isModuleComplete(makeModule('m1', ['l1', 'l2']), new Set(['l1', 'l2']))).toBe(true);
  });
});

describe('getNextModuleWithLessons', () => {
  it('devolve null quando o currentModuleId não existe', () => {
    const course = makeCourse([makeModule('m1', ['l1'])]);
    expect(getNextModuleWithLessons(course, 'fora')).toBeNull();
  });

  it('salta módulos sem aulas até encontrar um com aulas', () => {
    const course = makeCourse([
      makeModule('m1', ['l1']),
      makeModule('m2', []),
      makeModule('m3', ['l2']),
    ]);
    const next = getNextModuleWithLessons(course, 'm1');
    expect(next?.id).toBe('m3');
  });

  it('devolve null quando é o último módulo com aulas', () => {
    const course = makeCourse([makeModule('m1', ['l1']), makeModule('m2', ['l2'])]);
    expect(getNextModuleWithLessons(course, 'm2')).toBeNull();
  });
});

describe('isCourseComplete', () => {
  it('é false quando o curso não tem aulas', () => {
    const course = makeCourse([makeModule('m1', [])]);
    expect(isCourseComplete(course, new Set())).toBe(false);
  });

  it('é true quando todas as aulas estão no set', () => {
    const course = makeCourse([makeModule('m1', ['l1']), makeModule('m2', ['l2', 'l3'])]);
    expect(isCourseComplete(course, new Set(['l1', 'l2', 'l3']))).toBe(true);
  });

  it('é false quando falta pelo menos uma', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2'])]);
    expect(isCourseComplete(course, new Set(['l1']))).toBe(false);
  });
});

describe('getOrCreateCourseCompletion', () => {
  const COURSE_ID = 'c1';
  const EXISTING_DATE = '2026-05-19T10:30:00Z';
  const NEW_DATE = '2026-05-20T15:45:00Z';

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: empty responses; cada teste sequencia o que precisa.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  });

  it('devolve null quando não há sessão (sem leitura nem escrita)', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await getOrCreateCourseCompletion(COURSE_ID);
    expect(result).toBeNull();
    expect(mockSelect).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('devolve a data existente sem inserir quando o row já existe', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    mockMaybeSingle.mockResolvedValueOnce({ data: { completed_at: EXISTING_DATE }, error: null });

    const result = await getOrCreateCourseCompletion(COURSE_ID);

    expect(result).toBe(EXISTING_DATE);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('insere e devolve a nova data quando não há row', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    // 1º maybeSingle (select existing) → null. 2º maybeSingle (insert returning) → nova data.
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { completed_at: NEW_DATE }, error: null });

    const result = await getOrCreateCourseCompletion(COURSE_ID);

    expect(mockInsert).toHaveBeenCalledWith({
      user_id: '11111111-1111-4111-8111-111111111111',
      course_id: COURSE_ID,
    });
    expect(result).toBe(NEW_DATE);
  });

  it('em race condition (23505), faz refetch e devolve a data inserida pelo outro request', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    // 1º maybeSingle (select existing) → null.
    // 2º maybeSingle (insert returning) → erro 23505.
    // 3º maybeSingle (refetch após race) → encontra a data.
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'duplicate key' } })
      .mockResolvedValueOnce({ data: { completed_at: NEW_DATE }, error: null });

    const result = await getOrCreateCourseCompletion(COURSE_ID);

    expect(result).toBe(NEW_DATE);
    expect(mockInsert).toHaveBeenCalled();
  });

  it('devolve null se insert falha com erro não-23505 (não bloqueia o render)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile());
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'permission denied' },
    });

    const result = await getOrCreateCourseCompletion(COURSE_ID);

    expect(result).toBeNull();
  });
});
