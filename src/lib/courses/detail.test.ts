import { describe, it, expect, vi, beforeEach } from 'vitest';

type QResp<T = unknown> = { data: T | null; error: unknown };

const { mockSelect, mockEq, mockMaybeSingle } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockMaybeSingle: vi.fn(),
}));

let response: QResp = { data: null, error: null };
function setResponse(r: QResp): void {
  response = r;
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  maybeSingle: () => Promise<QResp>;
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
      return Promise.resolve(response);
    },
  };
  return builder;
}

vi.mock('@/lib/auth', () => ({
  getServerClient: vi.fn(async () => ({
    from: vi.fn(() => makeBuilder()),
  })),
}));

import {
  getCourseDetailById,
  getLessonDetailById,
  getLessonNavigation,
  getFirstLessonOfCourse,
  type CourseDetail,
} from './detail';

const COURSE_ID = '11111111-1111-4111-8111-111111111111';
const LESSON_ID = '00000000-0000-4000-8000-000000000000';

describe('getCourseDetailById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: null, error: null });
  });

  it('devolve null quando o id não existe', async () => {
    setResponse({ data: null, error: null });
    const result = await getCourseDetailById(COURSE_ID);
    expect(result).toBeNull();
  });

  it('lança Error quando supabase devolve error', async () => {
    setResponse({ data: null, error: { message: 'rls denied' } });
    await expect(getCourseDetailById(COURSE_ID)).rejects.toThrow(/rls denied/);
  });

  it('ordena módulos e aulas por position', async () => {
    setResponse({
      data: {
        id: COURSE_ID,
        title: 'Marcos',
        description: null,
        icon: null,
        modules: [
          {
            id: 'm2',
            title: 'M2',
            description: null,
            position: 1,
            lessons: [
              { id: 'l2', title: 'L2', description: null, template: 'pdf', position: 1 },
              { id: 'l1', title: 'L1', description: null, template: 'pdf', position: 0 },
            ],
          },
          {
            id: 'm1',
            title: 'M1',
            description: null,
            position: 0,
            lessons: [],
          },
        ],
      },
      error: null,
    });
    const result = await getCourseDetailById(COURSE_ID);
    expect(result).not.toBeNull();
    expect(result!.modules.map((m) => m.id)).toEqual(['m1', 'm2']);
    expect(result!.modules[1]!.lessons.map((l) => l.id)).toEqual(['l1', 'l2']);
  });

  it('filtra por id correcto', async () => {
    setResponse({ data: null, error: null });
    await getCourseDetailById(COURSE_ID);
    expect(mockEq).toHaveBeenCalledWith('id', COURSE_ID);
  });
});

describe('getLessonDetailById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: null, error: null });
  });

  it('devolve null quando o id não existe', async () => {
    setResponse({ data: null, error: null });
    const result = await getLessonDetailById(LESSON_ID);
    expect(result).toBeNull();
  });

  it('devolve null quando o embed do módulo é null', async () => {
    setResponse({
      data: {
        id: 'l1',
        title: 'L1',
        description: null,
        template: 'pdf',
        youtube_url: null,
        pdf_storage_path: 'path.pdf',
        position: 0,
        module: null,
      },
      error: null,
    });
    const result = await getLessonDetailById(LESSON_ID);
    expect(result).toBeNull();
  });

  it('mapeia lesson row para LessonDetail flatten', async () => {
    setResponse({
      data: {
        id: 'l1',
        title: 'L1',
        description: 'desc',
        template: 'video_pdf',
        youtube_url: 'https://youtu.be/abc12345678',
        pdf_storage_path: 'c1/l1.pdf',
        position: 2,
        module: {
          id: 'm1',
          title: 'M1',
          position: 1,
          course: { id: COURSE_ID, title: 'Marcos', icon: 'book-open' },
        },
      },
      error: null,
    });
    const result = await getLessonDetailById(LESSON_ID);
    expect(result).toEqual({
      id: 'l1',
      title: 'L1',
      description: 'desc',
      template: 'video_pdf',
      youtube_url: 'https://youtu.be/abc12345678',
      pdf_storage_path: 'c1/l1.pdf',
      position: 2,
      module: { id: 'm1', title: 'M1', position: 1 },
      course: { id: COURSE_ID, title: 'Marcos', icon: 'book-open' },
    });
  });

  it('lança Error quando supabase devolve error', async () => {
    setResponse({ data: null, error: { message: 'boom' } });
    await expect(getLessonDetailById(LESSON_ID)).rejects.toThrow(/boom/);
  });
});

function fakeCourse(): CourseDetail {
  return {
    id: COURSE_ID,
    title: 'Marcos',
    description: null,
    icon: null,
    bannerUrl: null,
    modules: [
      {
        id: 'm1',
        title: 'M1',
        description: null,
        position: 0,
        lessons: [
          { id: 'l1', title: 'L1', description: null, template: 'pdf', position: 0 },
          { id: 'l2', title: 'L2', description: null, template: 'pdf', position: 1 },
        ],
      },
      {
        id: 'm2',
        title: 'M2',
        description: null,
        position: 1,
        lessons: [{ id: 'l3', title: 'L3', description: null, template: 'pdf', position: 0 }],
      },
    ],
  };
}

describe('getLessonNavigation', () => {
  it('devolve previous=null no início', () => {
    expect(getLessonNavigation(fakeCourse(), 'l1').previous).toBeNull();
  });

  it('devolve next=null no fim', () => {
    expect(getLessonNavigation(fakeCourse(), 'l3').next).toBeNull();
  });

  it('atravessa fronteira de módulo (l2 → l3)', () => {
    const nav = getLessonNavigation(fakeCourse(), 'l2');
    expect(nav.next).toEqual({ id: 'l3', title: 'L3' });
  });

  it('previous l3 é l2 (módulo anterior, última aula)', () => {
    const nav = getLessonNavigation(fakeCourse(), 'l3');
    expect(nav.previous).toEqual({ id: 'l2', title: 'L2' });
  });

  it('devolve {previous: null, next: null} se lessonId não existir', () => {
    expect(getLessonNavigation(fakeCourse(), 'inexistente')).toEqual({
      previous: null,
      next: null,
    });
  });
});

describe('getFirstLessonOfCourse', () => {
  it('devolve a primeira aula do primeiro módulo com aulas', () => {
    expect(getFirstLessonOfCourse(fakeCourse())).toEqual({ id: 'l1' });
  });

  it('salta módulos sem aulas até encontrar uma', () => {
    const c: CourseDetail = {
      ...fakeCourse(),
      modules: [
        { id: 'm0', title: 'Empty', description: null, position: 0, lessons: [] },
        ...fakeCourse().modules,
      ],
    };
    expect(getFirstLessonOfCourse(c)).toEqual({ id: 'l1' });
  });

  it('devolve null se nenhum módulo tem aulas', () => {
    const c: CourseDetail = {
      id: COURSE_ID,
      title: 'X',
      description: null,
      icon: null,
      bannerUrl: null,
      modules: [{ id: 'm1', title: 'M', description: null, position: 0, lessons: [] }],
    };
    expect(getFirstLessonOfCourse(c)).toBeNull();
  });
});
