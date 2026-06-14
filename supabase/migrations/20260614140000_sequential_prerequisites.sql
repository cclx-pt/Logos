-- V3.6 — Pré-requisitos sequenciais (aula/módulo/curso).
--
-- Objectivo:
--   Permitir que um curso obrigue a concluir as aulas (e, por consequência,
--   os módulos) pela ordem definida, e que um curso só fique disponível
--   depois de outro estar concluído (cadeia opcional de cursos).
--
-- Decisão de âmbito (14-06-2026, líder do projeto): pré-requisitos
--   sequenciais estavam adiados para V4 em SPEC_1.md/status.md; foram
--   PUXADOS para V3.6 (mesmo padrão de Live, Q&A e Estatísticas). Migration
--   aplicada APENAS a `logos-dev` até ao lançamento (CLAUDE.md §🚫).
--
-- Decisões fechadas:
--   - DUAS flags independentes por curso (decisão do líder, 14-06-2026):
--       * `sequential_lessons` - as aulas têm de ser concluídas pela ordem
--         DENTRO de cada módulo (a aula 2 exige a aula 1 do mesmo módulo).
--       * `sequential_modules` - um módulo só abre depois de o anterior
--         (com aulas) estar totalmente concluído.
--     São ortogonais: dá para exigir ordem só das aulas, só dos módulos,
--     ambas, ou nenhuma.
--   - `prerequisite_course_id` é uma auto-referência nullable. NULL = curso
--     autónomo (standalone). Não-NULL = só acessível depois de o curso
--     apontado estar concluído. A cadeia A <- B <- C cria a "sequência de
--     cursos".
--   - Aplicação da regra é SERVER-SIDE (Server Components + Server Actions),
--     não em RLS — tal como a conclusão de curso (architecture.md §6: "a
--     regra 'todas as aulas concluídas' não está em RLS"). A conclusão é
--     dinâmica e por utilizador; metê-la em RLS exigiria juntar
--     lesson_completions em cada policy de lessons/modules sem ganho de
--     segurança real (o conteúdo continua a ser visível por etiqueta/role).
--   - Ciclos (A -> B -> A) são travados na Server Action de cursos (percorre
--     a cadeia antes de gravar). A DB só garante a não-auto-referência via
--     CHECK — defesa barata contra o caso trivial.
--
-- Padrões herdados (CLAUDE.md §🚫):
--   - FK aponta para courses.id (containment/relacional interno; on delete
--     set null para não apagar cursos dependentes quando o pré-requisito
--     desaparece — o curso passa a autónomo).
--   - Sem mudanças de RLS: as colunas vivem em `courses`, já coberto pelas
--     policies courses_select_visible / courses_update_admin (admin escreve
--     a linha inteira).

-- =============================================================================
-- 1. courses.sequential_lessons + courses.sequential_modules
-- =============================================================================

alter table courses
  add column sequential_lessons boolean not null default false;

comment on column courses.sequential_lessons is
  'Quando true, as aulas têm de ser concluídas pela ordem DENTRO de cada módulo (lesson.position). Independente de sequential_modules. Aplicado server-side (src/lib/courses/sequencing.ts), não em RLS.';

alter table courses
  add column sequential_modules boolean not null default false;

comment on column courses.sequential_modules is
  'Quando true, um módulo só fica acessível depois de o módulo anterior (com aulas) estar totalmente concluído (module.position). Independente de sequential_lessons. Aplicado server-side, não em RLS.';

-- =============================================================================
-- 2. courses.prerequisite_course_id
-- =============================================================================

alter table courses
  add column prerequisite_course_id uuid references courses(id) on delete set null;

comment on column courses.prerequisite_course_id is
  'Auto-referência nullable. NULL = curso autónomo. Não-NULL = só acessível depois de esse curso estar concluído (course_completions). on delete set null: apagar o pré-requisito torna este curso autónomo (nunca apaga em cascata). Ciclos travados na Server Action; CHECK abaixo trava só a auto-referência.';

-- Trava o caso trivial de auto-referência (curso pré-requisito de si mesmo).
-- Ciclos mais longos (A -> B -> A) são travados em createCourseAction/
-- updateCourseAction, que percorrem a cadeia antes de gravar.
alter table courses
  add constraint courses_prerequisite_not_self
  check (prerequisite_course_id is null or prerequisite_course_id <> id);

-- Índice para o lookup de "que cursos dependem deste" (usado no on delete
-- set null e em validações futuras) e para o embed do título do pré-requisito.
create index courses_prerequisite_course_id_idx
  on courses (prerequisite_course_id)
  where prerequisite_course_id is not null;
