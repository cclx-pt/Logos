import { describe, it, expect } from 'vitest';

import type { CourseDetail, ModuleWithLessons } from './detail';
import {
  findModuleOfLesson,
  flattenLessons,
  getFrontierLesson,
  getSequentialAccess,
} from './sequencing';

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

type Flags = { lessons?: boolean; modules?: boolean };

function makeCourse(modules: ModuleWithLessons[], flags: Flags = {}): CourseDetail {
  return {
    id: 'c1',
    title: 'Curso',
    description: null,
    icon: null,
    bannerUrl: null,
    sequentialLessons: flags.lessons ?? false,
    sequentialModules: flags.modules ?? false,
    prerequisite: null,
    modules: modules.map((m, i) => ({ ...m, position: i })),
  };
}

describe('getSequentialAccess — nenhuma flag', () => {
  it('não bloqueia nada', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])]);
    const { lockedLessonIds, lockedModuleIds } = getSequentialAccess(course, new Set());
    expect(lockedLessonIds.size).toBe(0);
    expect(lockedModuleIds.size).toBe(0);
  });
});

describe('getSequentialAccess — só aulas sequenciais', () => {
  it('bloqueia aulas seguintes dentro do módulo, mas não tranca módulos', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2', 'l3']), makeModule('m2', ['l4'])], {
      lessons: true,
    });
    const { lockedLessonIds, lockedModuleIds } = getSequentialAccess(course, new Set());
    expect(lockedLessonIds.has('l1')).toBe(false); // fronteira do m1
    expect(lockedLessonIds.has('l2')).toBe(true);
    expect(lockedLessonIds.has('l3')).toBe(true);
    // m2 NÃO está trancado (módulos não são sequenciais): a sua 1.ª aula abre.
    expect(lockedLessonIds.has('l4')).toBe(false);
    expect(lockedModuleIds.size).toBe(0);
  });

  it('cada módulo tem a sua própria fronteira independente', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3', 'l4'])], {
      lessons: true,
    });
    // m1 intacto; só l3 concluída em m2.
    const { lockedLessonIds } = getSequentialAccess(course, new Set(['l3']));
    expect(lockedLessonIds.has('l1')).toBe(false); // fronteira m1
    expect(lockedLessonIds.has('l2')).toBe(true);
    expect(lockedLessonIds.has('l4')).toBe(false); // fronteira m2 (l3 feita)
  });
});

describe('getSequentialAccess — só módulos sequenciais', () => {
  it('tranca módulos seguintes até o anterior estar completo; dentro do módulo a ordem é livre', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3', 'l4'])], {
      modules: true,
    });
    const semProgresso = getSequentialAccess(course, new Set());
    expect(semProgresso.lockedModuleIds.has('m1')).toBe(false);
    expect(semProgresso.lockedModuleIds.has('m2')).toBe(true);
    // m1 livre por dentro (aulas não sequenciais): nem l1 nem l2 bloqueadas.
    expect(semProgresso.lockedLessonIds.has('l1')).toBe(false);
    expect(semProgresso.lockedLessonIds.has('l2')).toBe(false);
    // m2 trancado: todas as aulas bloqueadas.
    expect(semProgresso.lockedLessonIds.has('l3')).toBe(true);
    expect(semProgresso.lockedLessonIds.has('l4')).toBe(true);
  });

  it('m1 completo desbloqueia m2', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], {
      modules: true,
    });
    const { lockedModuleIds, lockedLessonIds } = getSequentialAccess(course, new Set(['l1', 'l2']));
    expect(lockedModuleIds.has('m2')).toBe(false);
    expect(lockedLessonIds.has('l3')).toBe(false);
  });

  it('módulo parcialmente concluído ainda tranca o seguinte', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], {
      modules: true,
    });
    const { lockedModuleIds } = getSequentialAccess(course, new Set(['l1']));
    expect(lockedModuleIds.has('m2')).toBe(true);
  });
});

describe('getSequentialAccess — ambas as flags', () => {
  it('módulo trancado tranca tudo; módulo aberto exige ordem das aulas', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3', 'l4'])], {
      lessons: true,
      modules: true,
    });
    const semProgresso = getSequentialAccess(course, new Set());
    expect(semProgresso.lockedLessonIds.has('l1')).toBe(false); // fronteira m1
    expect(semProgresso.lockedLessonIds.has('l2')).toBe(true); // ordem das aulas
    expect(semProgresso.lockedModuleIds.has('m2')).toBe(true); // módulo trancado
    expect(semProgresso.lockedLessonIds.has('l3')).toBe(true);
    expect(semProgresso.lockedLessonIds.has('l4')).toBe(true);
  });
});

describe('getSequentialAccess — regras gerais', () => {
  it('aula concluída fora de ordem nunca fica bloqueada (permite rever)', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2', 'l3'])], { lessons: true });
    const { lockedLessonIds } = getSequentialAccess(course, new Set(['l3']));
    expect(lockedLessonIds.has('l3')).toBe(false);
    expect(lockedLessonIds.has('l2')).toBe(true);
  });

  it('módulo vazio não conta nem é contado na sequência de módulos', () => {
    const course = makeCourse(
      [makeModule('m1', ['l1']), makeModule('vazio', []), makeModule('m3', ['l2'])],
      {
        modules: true,
      },
    );
    const { lockedModuleIds } = getSequentialAccess(course, new Set(['l1']));
    expect(lockedModuleIds.has('vazio')).toBe(false);
    expect(lockedModuleIds.has('m3')).toBe(false); // m1 (único anterior com aulas) está completo
  });

  it('curso todo concluído não bloqueia nada', () => {
    const course = makeCourse([makeModule('m1', ['l1']), makeModule('m2', ['l2'])], {
      lessons: true,
      modules: true,
    });
    const { lockedLessonIds, lockedModuleIds } = getSequentialAccess(course, new Set(['l1', 'l2']));
    expect(lockedLessonIds.size).toBe(0);
    expect(lockedModuleIds.size).toBe(0);
  });
});

describe('getFrontierLesson', () => {
  it('devolve a primeira aula por concluir na ordem linear', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], {
      lessons: true,
      modules: true,
    });
    expect(getFrontierLesson(course, new Set(['l1']))?.id).toBe('l2');
    expect(getFrontierLesson(course, new Set(['l1', 'l2']))?.id).toBe('l3');
  });

  it('devolve null quando está tudo concluído', () => {
    const course = makeCourse([makeModule('m1', ['l1'])], { lessons: true });
    expect(getFrontierLesson(course, new Set(['l1']))).toBeNull();
  });

  it('a fronteira é sempre acessível (nunca está em lockedLessonIds)', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], {
      lessons: true,
      modules: true,
    });
    const completed = new Set(['l1']);
    const frontier = getFrontierLesson(course, completed)!;
    const { lockedLessonIds } = getSequentialAccess(course, completed);
    expect(lockedLessonIds.has(frontier.id)).toBe(false);
  });
});

describe('findModuleOfLesson', () => {
  it('encontra o módulo que contém a aula', () => {
    const course = makeCourse([makeModule('m1', ['l1']), makeModule('m2', ['l2'])]);
    expect(findModuleOfLesson(course, 'l2')?.id).toBe('m2');
  });

  it('devolve null quando a aula não existe', () => {
    const course = makeCourse([makeModule('m1', ['l1'])]);
    expect(findModuleOfLesson(course, 'inexistente')).toBeNull();
  });
});

describe('flattenLessons', () => {
  it('lineariza as aulas por ordem de módulo e posição', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])]);
    expect(flattenLessons(course).map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
  });
});
