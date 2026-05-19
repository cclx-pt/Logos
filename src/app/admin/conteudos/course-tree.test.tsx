import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

type QResp = { data: unknown; error: unknown };

const { mockSelect, mockEq, mockOrder, mockReturns } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockEq: vi.fn(),
  mockOrder: vi.fn(),
  mockReturns: vi.fn(),
}));

let response: QResp = { data: [], error: null };
function setResponse(r: QResp): void {
  response = r;
}

type Builder = {
  select: (...args: unknown[]) => Builder;
  eq: (...args: unknown[]) => Builder;
  order: (...args: unknown[]) => Builder;
  returns: () => Promise<QResp>;
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
    order: (...args) => {
      mockOrder(...args);
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

import { CourseTree } from './course-tree';

const COURSE_ID = 'c1';
const MODULE_A = 'm-a';
const MODULE_B = 'm-b';
const LESSON_A1 = 'l-a1';
const LESSON_A2 = 'l-a2';
const LESSON_B1 = 'l-b1';

function basicTree() {
  return [
    {
      id: MODULE_A,
      title: 'Módulo A',
      position: 0,
      lessons: [
        { id: LESSON_A1, title: 'Aula A1', position: 0 },
        { id: LESSON_A2, title: 'Aula A2', position: 1 },
      ],
    },
    {
      id: MODULE_B,
      title: 'Módulo B',
      position: 1,
      lessons: [{ id: LESSON_B1, title: 'Aula B1', position: 0 }],
    },
  ];
}

describe('CourseTree — render', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: [], error: null });
  });

  it('mostra heading "Estrutura"', async () => {
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);
    expect(screen.getByRole('heading', { level: 2, name: /^estrutura$/i })).toBeInTheDocument();
  });

  it('mostra mensagem quando não há módulos', async () => {
    setResponse({ data: [], error: null });
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);
    expect(screen.getByText(/ainda não há módulos/i)).toBeInTheDocument();
  });

  it('lança Error quando o Supabase devolve error', async () => {
    setResponse({ data: null, error: { message: 'rls denied' } });
    await expect(CourseTree({ courseId: COURSE_ID })).rejects.toThrow(/rls denied/i);
  });

  it('renderiza cada módulo com link para a sua página', async () => {
    setResponse({ data: basicTree(), error: null });
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);

    const moduleALink = screen.getByRole('link', { name: /1\. Módulo A/i });
    const moduleBLink = screen.getByRole('link', { name: /2\. Módulo B/i });
    expect(moduleALink).toHaveAttribute('href', `/admin/conteudos/${COURSE_ID}/${MODULE_A}`);
    expect(moduleBLink).toHaveAttribute('href', `/admin/conteudos/${COURSE_ID}/${MODULE_B}`);
  });

  it('renderiza aulas com links que abrem em modo edit (?editar=…)', async () => {
    setResponse({ data: basicTree(), error: null });
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);

    const aulaA1 = screen.getByRole('link', { name: /1\. Aula A1/i });
    expect(aulaA1).toHaveAttribute(
      'href',
      `/admin/conteudos/${COURSE_ID}/${MODULE_A}?editar=${LESSON_A1}`,
    );
    const aulaB1 = screen.getByRole('link', { name: /1\. Aula B1/i });
    expect(aulaB1).toHaveAttribute(
      'href',
      `/admin/conteudos/${COURSE_ID}/${MODULE_B}?editar=${LESSON_B1}`,
    );
  });

  it('ordena aulas por position mesmo quando vêm desordenadas da DB', async () => {
    setResponse({
      data: [
        {
          id: MODULE_A,
          title: 'Módulo A',
          position: 0,
          lessons: [
            { id: LESSON_A2, title: 'Aula A2', position: 1 },
            { id: LESSON_A1, title: 'Aula A1', position: 0 },
          ],
        },
      ],
      error: null,
    });
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);
    const links = screen
      .getAllByRole('link')
      .map((el) => el.textContent?.trim() ?? '')
      .filter((t) => /Aula/i.test(t));
    expect(links[0]).toMatch(/1\. Aula A1/i);
    expect(links[1]).toMatch(/2\. Aula A2/i);
  });

  it('mostra "Sem aulas" quando módulo está vazio', async () => {
    setResponse({
      data: [{ id: MODULE_A, title: 'Módulo Vazio', position: 0, lessons: [] }],
      error: null,
    });
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);
    expect(screen.getByText(/sem aulas/i)).toBeInTheDocument();
  });
});

describe('CourseTree — destaque do módulo/aula actual', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: basicTree(), error: null });
  });

  it('default-open: só o módulo actual abre sozinho', async () => {
    const tree = await CourseTree({ courseId: COURSE_ID, currentModuleId: MODULE_A });
    const { container } = render(tree);
    const detailsList = container.querySelectorAll('details');
    expect(detailsList).toHaveLength(2);
    expect(detailsList[0]).toHaveAttribute('open');
    expect(detailsList[1]).not.toHaveAttribute('open');
  });

  it('sem currentModuleId, nenhum módulo abre por defeito', async () => {
    const tree = await CourseTree({ courseId: COURSE_ID });
    const { container } = render(tree);
    const detailsList = container.querySelectorAll('details');
    expect(detailsList[0]).not.toHaveAttribute('open');
    expect(detailsList[1]).not.toHaveAttribute('open');
  });

  it('quando há currentLessonId mas estamos no módulo certo, marca aria-current na aula', async () => {
    const tree = await CourseTree({
      courseId: COURSE_ID,
      currentModuleId: MODULE_A,
      currentLessonId: LESSON_A2,
    });
    render(tree);
    const lessonLink = screen.getByRole('link', { name: /2\. Aula A2/i });
    expect(lessonLink).toHaveAttribute('aria-current', 'page');
  });

  it('o link do título do módulo só é aria-current quando NÃO há aula em edit', async () => {
    const tree = await CourseTree({
      courseId: COURSE_ID,
      currentModuleId: MODULE_A,
      currentLessonId: LESSON_A2,
    });
    render(tree);
    const moduleLink = screen.getByRole('link', { name: /1\. Módulo A/i });
    expect(moduleLink).not.toHaveAttribute('aria-current');
  });

  it('o link do módulo é aria-current quando estamos só na página do módulo (sem ?editar)', async () => {
    const tree = await CourseTree({ courseId: COURSE_ID, currentModuleId: MODULE_A });
    render(tree);
    const moduleLink = screen.getByRole('link', { name: /1\. Módulo A/i });
    expect(moduleLink).toHaveAttribute('aria-current', 'page');
  });

  it('aulas fora do módulo actual não recebem aria-current mesmo com currentLessonId', async () => {
    const tree = await CourseTree({
      courseId: COURSE_ID,
      currentModuleId: MODULE_A,
      currentLessonId: 'inexistente',
    });
    render(tree);
    const aulaA1 = screen.getByRole('link', { name: /1\. Aula A1/i });
    expect(aulaA1).not.toHaveAttribute('aria-current');
  });
});

describe('CourseTree — query Supabase', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: [], error: null });
  });

  it('filtra por course_id e ordena por position asc', async () => {
    await CourseTree({ courseId: COURSE_ID });
    expect(mockEq).toHaveBeenCalledWith('course_id', COURSE_ID);
    expect(mockOrder).toHaveBeenCalledWith('position', { ascending: true });
  });

  it('select embed inclui lessons (id, title, position)', async () => {
    await CourseTree({ courseId: COURSE_ID });
    expect(mockSelect).toHaveBeenCalledWith('id, title, position, lessons ( id, title, position )');
  });
});

// Guarda contra regressão visual: verificar que a árvore está dentro de um
// aside acessível.
describe('CourseTree — semantics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setResponse({ data: basicTree(), error: null });
  });

  it('renderiza-se dentro de um <aside aria-label="Estrutura do curso">', async () => {
    const tree = await CourseTree({ courseId: COURSE_ID });
    render(tree);
    const aside = screen.getByRole('complementary', { name: /estrutura do curso/i });
    expect(aside).toBeInTheDocument();
    expect(within(aside).getByRole('heading', { name: /estrutura/i })).toBeInTheDocument();
  });
});
