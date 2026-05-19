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
}));

// Fila de respostas consumida pelos terminais (maybeSingle/single/await em .eq()).
// Cada teste enche a fila pela ordem em que a action chama os terminais.
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
  })),
}));

vi.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import {
  createModuleAction,
  updateModuleAction,
  deleteModuleAction,
  moveModuleUpAction,
  moveModuleDownAction,
} from './actions';

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
const NEIGHBOR_ID = '44444444-4444-4444-8444-444444444444';
const OTHER_COURSE_ID = '55555555-5555-4555-8555-555555555555';

function formDataOf(entries: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe('createModuleAction (V3 PR4a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa quando não há sessão', async () => {
    mockGetCurrentUser.mockResolvedValue(null);
    const result = await createModuleAction(
      formDataOf({ course_id: COURSE_ID, title: 'Módulo 1' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await createModuleAction(
      formDataOf({ course_id: COURSE_ID, title: 'Módulo 1' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa course_id que não é UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createModuleAction(
      formDataOf({ course_id: 'not-uuid', title: 'Módulo 1' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/course_id/i) });
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('recusa título vazio', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await createModuleAction(formDataOf({ course_id: COURSE_ID, title: '   ' }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/título/i) });
  });

  it('cria primeiro módulo com position 0 quando o curso está vazio', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    // 1ª resposta: query do max (vazio) → null.
    // 2ª resposta: insert.select.single → id novo.
    setQueue({ data: null, error: null }, { data: { id: MODULE_ID }, error: null });

    const result = await createModuleAction(
      formDataOf({ course_id: COURSE_ID, title: 'Introdução', description: 'Primeiro módulo' }),
    );

    expect(result).toEqual({ ok: true, id: MODULE_ID });
    expect(mockInsert).toHaveBeenCalledWith({
      course_id: COURSE_ID,
      title: 'Introdução',
      description: 'Primeiro módulo',
      position: 0,
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/cursos/${COURSE_ID}`);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/conteudos');
  });

  it('cria módulo seguinte com position = max + 1', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('super_admin', CALLER_ID));
    setQueue({ data: { position: 3 }, error: null }, { data: { id: MODULE_ID }, error: null });

    const result = await createModuleAction(
      formDataOf({ course_id: COURSE_ID, title: 'Quarto módulo' }),
    );

    expect(result).toEqual({ ok: true, id: MODULE_ID });
    expect(mockInsert).toHaveBeenCalledWith({
      course_id: COURSE_ID,
      title: 'Quarto módulo',
      description: null,
      position: 4,
    });
  });

  it('propaga erro de DB com mensagem clara', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue({ data: null, error: null }, { data: null, error: { message: 'permission denied' } });

    const result = await createModuleAction(formDataOf({ course_id: COURSE_ID, title: 'Módulo' }));

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/permission denied/i) });
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('updateModuleAction (V3 PR4a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await updateModuleAction(
      formDataOf({ id: MODULE_ID, course_id: COURSE_ID, title: 'Editado' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('recusa quando id não é UUID', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    const result = await updateModuleAction(
      formDataOf({ id: 'nope', course_id: COURSE_ID, title: 'Editado' }),
    );
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/id/i) });
  });

  it('actualiza título + descrição e revalida o curso correcto', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue({ data: null, error: null });

    const result = await updateModuleAction(
      formDataOf({
        id: MODULE_ID,
        course_id: COURSE_ID,
        title: 'Título novo',
        description: 'Nova descrição',
      }),
    );

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenCalledWith({
      title: 'Título novo',
      description: 'Nova descrição',
    });
    expect(mockEq).toHaveBeenCalledWith('id', MODULE_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/cursos/${COURSE_ID}`);
  });
});

describe('deleteModuleAction (V3 PR4a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await deleteModuleAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('apaga e revalida o curso', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue({ data: null, error: null });

    const result = await deleteModuleAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockEq).toHaveBeenCalledWith('id', MODULE_ID);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/cursos/${COURSE_ID}`);
  });
});

describe('moveModuleUpAction (V3 PR4a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('recusa quando caller é user', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('user', CALLER_ID));
    const result = await moveModuleUpAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));
    expect(result).toEqual({ ok: false, error: expect.stringMatching(/admin/i) });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('recusa quando course_id do FormData não bate com o do módulo', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue({
      data: { id: MODULE_ID, position: 2, course_id: OTHER_COURSE_ID },
      error: null,
    });

    const result = await moveModuleUpAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));

    expect(result).toEqual({ ok: false, error: expect.stringMatching(/não pertence/i) });
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('faz swap com o vizinho imediato acima', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      // 1ª: current module
      { data: { id: MODULE_ID, position: 2, course_id: COURSE_ID }, error: null },
      // 2ª: neighbor query (lt position 2, order desc, limit 1, maybeSingle)
      { data: { id: NEIGHBOR_ID, position: 1 }, error: null },
      // 3ª: update current → neighbor.position
      { data: null, error: null },
      // 4ª: update neighbor → current.position (antiga)
      { data: null, error: null },
    );

    const result = await moveModuleUpAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    // Dois updates: primeiro current → 1, depois neighbor → 2.
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { position: 1 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { position: 2 });
    expect(mockLt).toHaveBeenCalledWith('position', 2);
    expect(mockRevalidatePath).toHaveBeenCalledWith(`/admin/cursos/${COURSE_ID}`);
  });

  it('é no-op quando já é o primeiro módulo (sem vizinho)', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { id: MODULE_ID, position: 0, course_id: COURSE_ID }, error: null },
      { data: null, error: null }, // sem vizinho
    );

    const result = await moveModuleUpAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });
});

describe('moveModuleDownAction (V3 PR4a)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setQueue();
  });

  it('faz swap com o vizinho imediato abaixo', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { id: MODULE_ID, position: 1, course_id: COURSE_ID }, error: null },
      { data: { id: NEIGHBOR_ID, position: 2 }, error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    const result = await moveModuleDownAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).toHaveBeenNthCalledWith(1, { position: 2 });
    expect(mockUpdate).toHaveBeenNthCalledWith(2, { position: 1 });
    expect(mockGt).toHaveBeenCalledWith('position', 1);
  });

  it('é no-op quando já é o último módulo', async () => {
    mockGetCurrentUser.mockResolvedValue(makeProfile('admin', CALLER_ID));
    setQueue(
      { data: { id: MODULE_ID, position: 5, course_id: COURSE_ID }, error: null },
      { data: null, error: null },
    );

    const result = await moveModuleDownAction(formDataOf({ id: MODULE_ID, course_id: COURSE_ID }));

    expect(result).toEqual({ ok: true });
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
