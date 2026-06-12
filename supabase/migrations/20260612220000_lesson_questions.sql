-- V3.5 — Perguntas às aulas ("Pergunta aos professores"). Q&A puxado de V5.
--
-- Contexto: SPEC_1.md §V5 prevê "campo de perguntas por aula", "perguntas
-- guardadas em base de dados", "vista de caixa de entrada para a equipa de
-- admins" e "notificação por email aos admins via Resend". Por decisão do
-- líder (12-06-2026) esta fatia da V5 é antecipada para o ciclo V3 — tal como
-- as estatísticas foram puxadas em 30-05-2026. SPEC bump a registar no PR de
-- docs (corrige também §257/§478 que diziam "sem campo de perguntas").
--
-- Esta migration entrega só o schema (sem UI): a tabela, RLS e o
-- column-scoping do UPDATE. A submissão (aluno) e a inbox (admin) vêm nos PRs
-- seguintes. Ship-able sozinha (CI verde, sem impacto em nada existente).
--
-- Decisões fechadas:
--   - Aluno NÃO lê (a resposta vai por email, Reply-To). SELECT só admin —
--     é uma caixa de entrada interna.
--   - Snapshot dos títulos curso/módulo/aula no momento do envio: a inbox
--     continua legível mesmo que a aula seja renomeada ou apagada (princípio
--     "IDs estáveis" de CLAUDE.md). lesson_id mantém-se como referência viva
--     mas ON DELETE SET NULL para a pergunta sobreviver à remoção da aula.
--   - Email do aluno NUNCA guardado aqui (regra dura: vive em auth.users). A
--     Server Action lê-o on-demand da camada de identidade para o Reply-To.
--   - status: triagem leve (new → answered → archived). A equipa responde
--     fora da plataforma; o estado serve só para não perder o fio.
--   - UPDATE column-scoped: mesmo um admin só pode mudar `status`; body e
--     identidade são imutáveis (row-auth ≠ column-auth — mesmo padrão do
--     lockdown de profiles 160000 e de course_access_log 120000).
--
-- Padrões herdados (CLAUDE.md §🚫 + RLS V3):
--   - FK para profiles.id (nunca auth.users).
--   - Policies via current_profile_id() / current_profile_role() /
--     course_is_visible() — todos SECURITY DEFINER, sem recursão.
--   - updated_at via trigger comum set_updated_at().
--
-- REGRA DURA: migrations V3 só em `logos-dev`. Nunca aplicadas a `logos-prod`
-- antes de 01-07-2026 (lançamento).

-- =============================================================================
-- 1. Tabela lesson_questions
-- =============================================================================

create table lesson_questions (
  id uuid primary key default gen_random_uuid(),
  -- Referência viva à aula. SET NULL (não CASCADE): a pergunta sobrevive à
  -- remoção da aula porque os títulos ficam em snapshot abaixo.
  lesson_id uuid references lessons(id) on delete set null,
  -- Autor (aluno). CASCADE: se a conta é apagada, a pergunta perde sentido e
  -- não há ninguém a quem responder. Mesmo princípio de lesson_completions.
  profile_id uuid not null references profiles(id) on delete cascade,
  -- Snapshots de contexto (legibilidade pós-rename/delete). Títulos de
  -- curso/módulo/aula são <= 120 chars no schema; 200 dá folga.
  course_title text not null check (length(course_title) between 1 and 200),
  module_title text not null check (length(module_title) between 1 and 200),
  lesson_title text not null check (length(lesson_title) between 1 and 200),
  -- Corpo da pergunta. CHECK espelha a validação Zod/TS (defesa em profundidade).
  body text not null check (length(body) between 10 and 2000),
  status text not null default 'new'
    check (status in ('new', 'answered', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table lesson_questions is
  'Perguntas dos alunos às aulas ("Pergunta aos professores"). Caixa de entrada interna (SELECT só admin); a resposta ao aluno vai por email (Reply-To). Títulos em snapshot para a inbox sobreviver a rename/delete da aula. Email do autor NÃO vive aqui — está em auth.users.';

comment on column lesson_questions.lesson_id is
  'Referência viva à aula. ON DELETE SET NULL: a pergunta sobrevive à remoção da aula (os títulos ficam em snapshot). Pode ser null só nesse caso — no INSERT a RLS exige uma aula visível.';

comment on column lesson_questions.status is
  'Triagem da equipa: new (por tratar) → answered (respondida por email) → archived. Único campo alterável por UPDATE (column-scoped abaixo).';

create index lesson_questions_status_created_idx
  on lesson_questions (status, created_at desc);
create index lesson_questions_profile_id_idx on lesson_questions (profile_id);
create index lesson_questions_lesson_id_idx on lesson_questions (lesson_id);

create trigger lesson_questions_set_updated_at
  before update on lesson_questions
  for each row execute function set_updated_at();

-- =============================================================================
-- 2. RLS
-- =============================================================================

alter table lesson_questions enable row level security;

-- SELECT: só admin/super_admin. O aluno não lê a inbox; recebe resposta por
-- email. (Se uma vista "as minhas perguntas" for entregue mais tarde,
-- acrescenta-se uma policy own — fica fora de âmbito por agora.)
create policy "lesson_questions_select_admin"
  on lesson_questions
  for select
  using (current_profile_role() in ('admin', 'super_admin'));

-- INSERT: o próprio aluno (profile_id = ele), e só sobre uma aula que
-- consegue ver. O EXISTS sobre course_is_visible() impede perguntar sobre
-- aulas escondidas por etiqueta e força lesson_id não-nulo no INSERT (defesa
-- em profundidade — a Server Action também valida visibilidade e inscrição).
create policy "lesson_questions_insert_self_visible"
  on lesson_questions
  for insert
  with check (
    profile_id = current_profile_id()
    and exists (
      select 1
      from lessons l
      join modules m on m.id = l.module_id
      join courses c on c.id = m.course_id
      where l.id = lesson_questions.lesson_id
        and course_is_visible(c)
    )
  );

-- UPDATE: row-scoping a admin via policy; column-scoping a `status` via grant.
-- Em conjunto: só admin actualiza, e só a coluna status (body/identidade/
-- snapshots imutáveis). updated_at é tocado pelo trigger (fora do grant do
-- caller — triggers não estão sujeitos aos privilégios de coluna do invoker).
create policy "lesson_questions_update_status_admin"
  on lesson_questions
  for update
  using (current_profile_role() in ('admin', 'super_admin'))
  with check (current_profile_role() in ('admin', 'super_admin'));

revoke update on table lesson_questions from anon, authenticated;
grant update (status) on table lesson_questions to authenticated;

-- DELETE: só super_admin (limpeza de spam). Sem policy para admin/user.
create policy "lesson_questions_delete_super_admin"
  on lesson_questions
  for delete
  using (current_profile_role() = 'super_admin');
