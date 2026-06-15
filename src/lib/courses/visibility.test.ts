import { describe, it, expect, vi, beforeEach } from 'vitest';

type QResp = { data: unknown; error: unknown };

const { mockSelect, mockOrder, mockIlike, mockIn, mockReturns } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockOrder: vi.fn(),
  mockIlike: vi.fn(),
  mockIn: vi.fn(),
  mockReturns: vi.fn(),
}));

// Resposta única (default) + fila opcional. A fila serve testes com mais de
// uma query (ex.: cursos + lookup em lote dos títulos dos pré-requisitos):
// cada `.returns()` consome o próximo item; esgotada a fila, cai no default.
let response: QResp = { data: [], error: null };
let responseQueue: QResp[] = [];
function setResponse(r: QResp): void {
  response = r;
}
function setResponses(rs: QResp[]): void {
  responseQueue = [...rs];
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  ilike: (...args: unknown[]) => Builder;
  in: (...args: unknown[]) => Builder;
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
    in: (...args) => {
      mockIn(...args);
      return builder;
    },
    returns: () => {
      mockReturns();
      const next = responseQueue.shift();
      return Promise.resolve(next ?? response);
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
  prerequisite_course_id: null,
};

describe('getVisibleCoursesForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: [], error: null });
    setResponses([]);
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
        prerequisite: null,
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
      'id, title, description, icon, banner_storage_path, prerequisite_course_id, modules ( lessons ( count ) )',
    );
  });

  it('resolve o título do pré-requisito em lote (V3.6)', async () => {
    setResponses([
      {
        data: [{ ...baseRow, prerequisite_course_id: 'prereq-1', modules: [] }],
        error: null,
      },
      { data: [{ id: 'prereq-1', title: 'Fundamentos' }], error: null },
    ]);
    const [course] = await getVisibleCoursesForUser();
    expect(course.prerequisite).toEqual({ id: 'prereq-1', title: 'Fundamentos' });
    expect(mockIn).toHaveBeenCalledWith('id', ['prereq-1']);
  });

  it('prerequisite=null quando o pré-requisito não é visível (fora do Map)', async () => {
    setResponses([
      {
        data: [{ ...baseRow, prerequisite_course_id: 'invisivel', modules: [] }],
        error: null,
      },
      { data: [], error: null }, // RLS escondeu o curso pré-requisito
    ]);
    const [course] = await getVisibleCoursesForUser();
    expect(course.prerequisite).toBeNull();
  });
});
