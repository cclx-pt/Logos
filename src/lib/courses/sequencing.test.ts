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

function makeCourse(modules: ModuleWithLessons[], sequential: boolean): CourseDetail {
  return {
    id: 'c1',
    title: 'Curso',
    description: null,
    icon: null,
    bannerUrl: null,
    sequential,
    prerequisite: null,
    modules: modules.map((m, i) => ({ ...m, position: i })),
  };
}

describe('getSequentialAccess', () => {
  it('curso não-sequencial não bloqueia nada', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2', 'l3'])], false);
    const { lockedLessonIds, lockedModuleIds } = getSequentialAccess(course, new Set());
    expect(lockedLessonIds.size).toBe(0);
    expect(lockedModuleIds.size).toBe(0);
  });

  it('sem progresso: a primeira aula fica acessível, as restantes bloqueadas', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2', 'l3'])], true);
    const { lockedLessonIds } = getSequentialAccess(course, new Set());
    expect(lockedLessonIds.has('l1')).toBe(false); // fronteira
    expect(lockedLessonIds.has('l2')).toBe(true);
    expect(lockedLessonIds.has('l3')).toBe(true);
  });

  it('com a primeira concluída, desbloqueia a segunda (fronteira) mas não a terceira', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2', 'l3'])], true);
    const { lockedLessonIds } = getSequentialAccess(course, new Set(['l1']));
    expect(lockedLessonIds.has('l1')).toBe(false);
    expect(lockedLessonIds.has('l2')).toBe(false);
    expect(lockedLessonIds.has('l3')).toBe(true);
  });

  it('a sequência atravessa módulos (módulo 2 só abre após o módulo 1)', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], true);
    const semProgresso = getSequentialAccess(course, new Set());
    expect(semProgresso.lockedModuleIds.has('m1')).toBe(false);
    expect(semProgresso.lockedModuleIds.has('m2')).toBe(true);

    const m1Feito = getSequentialAccess(course, new Set(['l1', 'l2']));
    expect(m1Feito.lockedModuleIds.has('m2')).toBe(false);
    expect(m1Feito.lockedLessonIds.has('l3')).toBe(false);
  });

  it('aula concluída fora de ordem nunca fica bloqueada (permite rever)', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2', 'l3'])], true);
    // l3 concluída mas l2 não: l3 já foi feita, não deve bloquear.
    const { lockedLessonIds } = getSequentialAccess(course, new Set(['l3']));
    expect(lockedLessonIds.has('l3')).toBe(false);
    expect(lockedLessonIds.has('l2')).toBe(true);
  });

  it('módulo vazio nunca conta como bloqueado', () => {
    const course = makeCourse([makeModule('m1', ['l1']), makeModule('m2', [])], true);
    const { lockedModuleIds } = getSequentialAccess(course, new Set());
    expect(lockedModuleIds.has('m2')).toBe(false);
  });

  it('curso todo concluído não bloqueia nada', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2'])], true);
    const { lockedLessonIds, lockedModuleIds } = getSequentialAccess(course, new Set(['l1', 'l2']));
    expect(lockedLessonIds.size).toBe(0);
    expect(lockedModuleIds.size).toBe(0);
  });
});

describe('getFrontierLesson', () => {
  it('devolve a primeira aula por concluir na ordem linear', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], true);
    expect(getFrontierLesson(course, new Set(['l1']))?.id).toBe('l2');
    expect(getFrontierLesson(course, new Set(['l1', 'l2']))?.id).toBe('l3');
  });

  it('devolve null quando está tudo concluído', () => {
    const course = makeCourse([makeModule('m1', ['l1'])], true);
    expect(getFrontierLesson(course, new Set(['l1']))).toBeNull();
  });
});

describe('findModuleOfLesson', () => {
  it('encontra o módulo que contém a aula', () => {
    const course = makeCourse([makeModule('m1', ['l1']), makeModule('m2', ['l2'])], true);
    expect(findModuleOfLesson(course, 'l2')?.id).toBe('m2');
  });

  it('devolve null quando a aula não existe', () => {
    const course = makeCourse([makeModule('m1', ['l1'])], true);
    expect(findModuleOfLesson(course, 'inexistente')).toBeNull();
  });
});

describe('flattenLessons', () => {
  it('lineariza as aulas por ordem de módulo e posição', () => {
    const course = makeCourse([makeModule('m1', ['l1', 'l2']), makeModule('m2', ['l3'])], true);
    expect(flattenLessons(course).map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
  });
});
