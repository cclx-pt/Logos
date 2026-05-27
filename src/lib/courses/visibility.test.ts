import { describe, it, expect, vi, beforeEach } from 'vitest';

type QResp = { data: unknown; error: unknown };

const { mockSelect, mockOrder, mockIlike, mockReturns } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockIlike: vi.fn(),
  mockReturns: vi.fn(),
}));

let response: QResp = { data: [], error: null };
function setResponse(r: QResp): void {
  response = r;
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  ilike: (...args: unknown[]) => Builder;
  returns: () => Promise<QResp>;
};

function makeBuilder(): Builder {
  const builder: Builder = {
    select: (...args) => {
      mockSelect(...args);
      return builder;
    },
    order: (...args) => {
      mockOrder(...args);
      return builder;
    },
    ilike: (...args) => {
      mockIlike(...args);
      return builder;
    },
    returns: () => {
      mockReturns();
      return Promise.resolve(response);
    },
  };
  return builder;
}

vi.mock('@/lib/auth', () => ({
  getServerClient: vi.fn(async () => ({
    from: () => makeBuilder(),
  })),
}));

import { getVisibleCoursesForUser } from './visibility';

const baseRow = {
  id: 'c1',
  title: 'O Reino de Deus',
  description: 'Curso introdutório',
  icon: 'cross',
  banner_storage_path: null,
};

describe('getVisibleCoursesForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: [], error: null });
  });

  it('devolve array vazia quando data é null', async () => {
    setResponse({ data: null, error: null });
    const result = await getVisibleCoursesForUser();
    expect(result).toEqual([]);
  });

  it('lança Error quando o Supabase devolve error', async () => {
    setResponse({ data: null, error: { message: 'rls denied' } });
    await expect(getVisibleCoursesForUser()).rejects.toThrow(/rls denied/i);
  });

  it('mapeia rows para VisibleCourse com hasLessons = true se algum módulo tem count > 0', async () => {
    setResponse({
      data: [
        {
          ...baseRow,
          modules: [{ lessons: [{ count: 0 }] }, { lessons: [{ count: 3 }] }],
        },
      ],
      error: null,
    });
    const result = await getVisibleCoursesForUser();
    expect(result).toEqual([
      {
        id: 'c1',
        title: 'O Reino de Deus',
        description: 'Curso introdutório',
        icon: 'cross',
        bannerUrl: null,
        hasLessons: true,
      },
    ]);
  });

  it('hasLessons = false se todos os módulos têm count = 0', async () => {
    setResponse({
      data: [
        {
          ...baseRow,
          modules: [{ lessons: [{ count: 0 }] }, { lessons: [{ count: 0 }] }],
        },
      ],
      error: null,
    });
    const [course] = await getVisibleCoursesForUser();
    expect(course.hasLessons).toBe(false);
  });

  it('hasLessons = false quando modules é null', async () => {
    setResponse({
      data: [{ ...baseRow, modules: null }],
      error: null,
    });
    const [course] = await getVisibleCoursesForUser();
    expect(course.hasLessons).toBe(false);
  });

  it('hasLessons = false quando modules é array vazia', async () => {
    setResponse({
      data: [{ ...baseRow, modules: [] }],
      error: null,
    });
    const [course] = await getVisibleCoursesForUser();
    expect(course.hasLessons).toBe(false);
  });

  it('hasLessons = false quando módulo não tem lessons (null)', async () => {
    setResponse({
      data: [{ ...baseRow, modules: [{ lessons: null }] }],
      error: null,
    });
    const [course] = await getVisibleCoursesForUser();
    expect(course.hasLessons).toBe(false);
  });

  it('não chama .ilike quando query não é dado', async () => {
    await getVisibleCoursesForUser();
    expect(mockIlike).not.toHaveBeenCalled();
  });

  it('não chama .ilike quando query é só whitespace', async () => {
    await getVisibleCoursesForUser({ query: '   ' });
    expect(mockIlike).not.toHaveBeenCalled();
  });

  it('chama .ilike(title, %q%) quando query é fornecida', async () => {
    await getVisibleCoursesForUser({ query: 'marcos' });
    expect(mockIlike).toHaveBeenCalledWith('title', '%marcos%');
  });

  it('faz trim do query antes de aplicar', async () => {
    await getVisibleCoursesForUser({ query: '  Reino  ' });
    expect(mockIlike).toHaveBeenCalledWith('title', '%Reino%');
  });

  it('limita o query a 80 chars', async () => {
    const longQuery = 'a'.repeat(200);
    await getVisibleCoursesForUser({ query: longQuery });
    const [, value] = mockIlike.mock.calls[0] as [string, string];
    // %...% adiciona 2 chars; o termo interno tem o máximo de 80.
    expect(value.length).toBe(82);
  });

  it('ordena por título ascendente', async () => {
    await getVisibleCoursesForUser();
    expect(mockOrder).toHaveBeenCalledWith('title', { ascending: true });
  });

  it('seleciona campos + embed modules/lessons(count) num único query', async () => {
    await getVisibleCoursesForUser();
    expect(mockSelect).toHaveBeenCalledWith(
      'id, title, description, icon, banner_storage_path, modules ( lessons ( count ) )',
    );
  });
});
