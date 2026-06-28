-- =============================================================================
-- V3.1 T4: utilizador vê o seu próprio histórico de acessos
-- =============================================================================
--
-- A rota "Os meus cursos" (`/meus-cursos`, V3.1 T4) alimenta-se de
-- `course_access_log`: mostra os cursos onde o user clicou "Começar/Continuar"
-- no passado, ordenados pelo último acesso.
--
-- A policy original de PR2 (`course_access_log_select_admin`) só dava SELECT
-- a admin/super_admin — auditoria de stats. Para que o helper
-- `getStartedCoursesForUser()` funcione na sessão de um user normal,
-- acrescentamos uma segunda policy SELECT permissiva. No Postgres, múltiplas
-- policies do mesmo tipo compõem via OR — mesmo padrão de `lesson_completions`
-- ("own OR admin", criado em PR2).
--
-- INSERT/UPDATE/DELETE ficam inalterados:
--   - INSERT: `course_access_log_insert_self` (PR2) — só o próprio escreve.
--   - UPDATE/DELETE: sem policy — append-only por design.

create policy "course_access_log_select_own"
  on public.course_access_log
  for select
  using (user_id = current_profile_id());

comment on policy "course_access_log_select_own" on public.course_access_log is
  'V3.1 T4: utilizador vê o próprio histórico de acessos (alimenta /meus-cursos). Compõe OR com course_access_log_select_admin (PR2).';
