-- V3 (pull-forward de V5) — estatísticas profundas: visitas a aulas + contagem
-- de utilizadores registados acessível a admins.
--
-- Contexto:
--   O dashboard profundo de estatísticas é V5 no SPEC_1.md §9; foi puxado para
--   o período de V3 a pedido do utilizador. Faltavam dois suportes de dados:
--     1. "Aulas/módulos mais visitados" — não havia tracking de visitas a aulas
--        (só `course_access_log` ao nível do curso). Nova tabela `lesson_views`.
--     2. "Utilizadores registados" — o RLS de `profiles` só dá SELECT ao próprio
--        ou a super_admin, logo um admin normal não consegue contar. Função
--        SECURITY DEFINER que devolve só a contagem (sem expor linhas/PII).
--
-- Padrões herdados (CLAUDE.md + migrations V3):
--   - FK para profiles.id (nunca auth.users).
--   - Helpers current_profile_id()/current_profile_role() (SECURITY DEFINER).
--   - Log imutável (sem UPDATE/DELETE policies), como course_access_log.

-- =============================================================================
-- 1. lesson_views — registo de visitas a aulas
-- =============================================================================

create table lesson_views (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  lesson_id uuid not null references lessons(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

comment on table lesson_views is
  'Registo de visitas a aulas (escrito best-effort por logLessonViewAction quando o utilizador abre a página de aula). Sem unique — visitas repetidas são esperadas; stats fazem count(*) e count(distinct user_id). Imutável.';

create index lesson_views_lesson_id_idx on lesson_views (lesson_id);
create index lesson_views_viewed_at_idx on lesson_views (viewed_at desc);

alter table lesson_views enable row level security;

-- SELECT: só admin/super_admin (tabela de telemetria, como course_access_log).
create policy "lesson_views_select_admin"
  on lesson_views
  for select
  using (current_profile_role() in ('admin', 'super_admin'));

-- INSERT: o próprio utilizador para si mesmo.
create policy "lesson_views_insert_self"
  on lesson_views
  for insert
  with check (user_id = current_profile_id());

-- Sem UPDATE/DELETE — log imutável.

-- =============================================================================
-- 2. count_registered_users() — contagem de profiles para admins
-- =============================================================================

-- SECURITY DEFINER para contornar o RLS de profiles (que limita SELECT ao
-- próprio/super_admin). Devolve APENAS um número — nunca linhas nem PII — e só
-- a quem for admin/super_admin; para os restantes devolve NULL.
create or replace function count_registered_users() returns integer
  language sql
  stable
  security definer
  set search_path = public
as $$
  select case
    when current_profile_role() in ('admin', 'super_admin')
      then (select count(*)::int from profiles)
    else null
  end
$$;

comment on function count_registered_users() is
  'Devolve count(*) de profiles, mas só se o caller for admin/super_admin (senão NULL). SECURITY DEFINER para o card "Utilizadores registados" funcionar para admins normais sem expor linhas de profiles (RLS de profiles é só own/super_admin).';
