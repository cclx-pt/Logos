import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSelect, mockEq, mockIn, mockReturns } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockIn: vi.fn(),
  mockReturns: vi.fn(),
}));

type AccessResponse = { data: unknown; error: unknown };
type CountResponse = { count: number | null; error: unknown };

let accessResponse: AccessResponse = { data: [], error: null };
let countResponse: CountResponse = { count: 0, error: null };

function setAccessResponse(r: AccessResponse): void {
  accessResponse = r;
}
function setCountResponse(r: CountResponse): void {
  countResponse = r;
}

type AccessBuilder = {
  select: (...args: unknown[]) => AccessBuilder;
  eq: (...args: unknown[]) => AccessBuilder;
  returns: () => Promise<AccessResponse>;
};

type CountBuilder = {
  select: (...args: unknown[]) => CountBuilder;
  in: (...args: unknown[]) => Promise<CountResponse>;
};

function makeAccessBuilder(): AccessBuilder {
  const builder: AccessBuilder = {
    select: (...args) => {
      mockSelect(...args);
      return builder;
    },
    eq: (...args) => {
      mockEq(...args);
      return builder;
    },
    returns: () => {
      mockReturns();
      return Promise.resolve(accessResponse);
    },
  };
  return builder;
}

function makeCountBuilder(): CountBuilder {
  const builder: CountBuilder = {
    select: (...args) => {
      mockSelect(...args);
      return builder;
    },
    in: (...args) => {
      mockIn(...args);
      return Promise.resolve(countResponse);
    },
  };
  return builder;
}

vi.mock('@/lib/auth', () => ({
  getServerClient: vi.fn(async () => ({
    from: vi.fn((table: string) => {
      if (table === 'course_access_log') return makeAccessBuilder();
      if (table === 'lesson_completions') return makeCountBuilder();
      throw new Error(`Unexpected table: ${table}`);
    }),
  })),
}));

import { getCourseStats } from './stats';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_A = '22222222-2222-4222-8222-222222222222';
const LESSON_B = '33333333-3333-4333-8333-333333333333';

describe('getCourseStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setAccessResponse({ data: [], error: null });
    setCountResponse({ count: 0, error: null });
  });

  it('devolve zeros quando não há acessos nem aulas', async () => {
    const result = await getCourseStats(COURSE_ID, []);
    expect(result).toEqual({ totalAccesses: 0, uniqueUsers: 0, lessonCompletions: 0 });
    // Sem lessonIds não consultamos lesson_completions
    expect(mockIn).not.toHaveBeenCalled();
  });

  it('conta total + distintos a partir das linhas de course_access_log', async () => {
    setAccessResponse({
      data: [
        { user_id: 'u1' },
        { user_id: 'u1' },
        { user_id: 'u2' },
        { user_id: 'u3' },
        { user_id: 'u2' },
      ],
      error: null,
    });
    setCountResponse({ count: 4, error: null });

    const result = await getCourseStats(COURSE_ID, [LESSON_A, LESSON_B]);

    expect(mockEq).toHaveBeenCalledWith('course_id', COURSE_ID);
    expect(mockIn).toHaveBeenCalledWith('lesson_id', [LESSON_A, LESSON_B]);
    expect(result).toEqual({ totalAccesses: 5, uniqueUsers: 3, lessonCompletions: 4 });
  });

  it('propaga erro do select de acessos', async () => {
    setAccessResponse({ data: null, error: { message: 'rls deny' } });
    await expect(getCourseStats(COURSE_ID, [LESSON_A])).rejects.toThrow(/rls deny/);
  });

  it('propaga erro do count de conclusões', async () => {
    setAccessResponse({ data: [], error: null });
    setCountResponse({ count: null, error: { message: 'boom' } });
    await expect(getCourseStats(COURSE_ID, [LESSON_A])).rejects.toThrow(/boom/);
  });

  it('aceita count null e devolve 0', async () => {
    setCountResponse({ count: null, error: null });
    const result = await getCourseStats(COURSE_ID, [LESSON_A]);
    expect(result.lessonCompletions).toBe(0);
  });
});
