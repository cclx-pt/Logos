-- =============================================================================
-- V3.3 PR8 — enrollment + anon landing
-- =============================================================================
-- Mudanças:
--   1. `course_access_log` ganha coluna `unenrolled_at` (timestamptz nullable).
--      A row mais recente por (user, course) determina o estado de
--      inscrição: NULL = inscrito; not-null = saiu.
--   2. Nova policy UPDATE em `course_access_log` para utilizador alterar a
--      própria row (para set unenrolled_at = now() via `unenrollAction`).
--   3. `course_is_visible(courses)` passa a aceitar anon para courses
--      published + sem required_tags. Permite ao público ver banner +
--      título + descrição em `/conteudos/[courseId]` sem login (landing
--      anon descrita em feature-docs/v3-3-handoff.md).
--   4. Policies SELECT de `modules` e `lessons` passam a exigir
--      explicitamente `auth.role() = 'authenticated'`. Anon vê o curso (1.)
--      mas NÃO os módulos/aulas — alinhado com a spec do estado anónimo.
--   5. Storage `course-banners` e `lesson-pdfs` continuam a usar
--      `course_is_visible(c)`. Banners ficam acessíveis a anon (queremos);
--      PDFs continuam a precisar do path com courseId/lessonId que só
--      utilizadores autenticados conhecem (UI nunca expõe), e o controlo
--      fino de enrollment vive no Server Action `getLessonPdfSignedUrlAction`.
-- =============================================================================

-- 1. unenrolled_at column
alter table public.course_access_log add column if not exists unenrolled_at timestamptz null;

comment on column public.course_access_log.unenrolled_at is
  'NULL = inscrição activa. Set via "Sair do curso" na UI (unenrollAction). V3.3 PR8.';

-- Index para procurar a row mais recente por (user, course) — usado em
-- enrollment.getEnrollmentState().
create index if not exists course_access_log_user_course_recent_idx
  on public.course_access_log (user_id, course_id, accessed_at desc);

-- 2. UPDATE policy
drop policy if exists "course_access_log_update_own" on public.course_access_log;
create policy "course_access_log_update_own"
  on public.course_access_log
  for update
  using (user_id = current_profile_id())
  with check (user_id = current_profile_id());

comment on policy "course_access_log_update_own" on public.course_access_log is
  'Permite ao utilizador actualizar a sua própria row — usado para set unenrolled_at. V3.3 PR8.';

-- 3. course_is_visible — anon ganha acesso a courses published + sem tags
create or replace function public.course_is_visible(course_row public.courses) returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select
    -- Admin/super_admin vê tudo (incluindo drafts)
    current_profile_role() in ('admin', 'super_admin')
    -- Anon vê published + sem required_tags (landing pública V3.3 PR8)
    or (
      auth.role() = 'anon'
      and course_row.published_at is not null
      and cardinality(course_row.required_tags) = 0
    )
    -- Utilizador autenticado vê published + (sem tags OR overlap com as suas)
    or (
      auth.role() = 'authenticated'
      and course_row.published_at is not null
      and (
        cardinality(course_row.required_tags) = 0
        or current_profile_has_tag(course_row.required_tags)
      )
    )
$$;

comment on function public.course_is_visible(public.courses) is
  'Decide se utilizador (anon ou autenticado) pode ver um curso. Admins: tudo. Anon: published + sem required_tags (V3.3 PR8 landing). Auth: published + (sem tags OR overlap). Usada nas policies de courses + storage (banners visíveis a anon).';

-- 4. modules + lessons: explicitamente auth-only
drop policy if exists "modules_select_visible" on public.modules;
create policy "modules_select_visible"
  on public.modules
  for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1 from public.courses c
      where c.id = modules.course_id
        and public.course_is_visible(c)
    )
  );

drop policy if exists "lessons_select_visible" on public.lessons;
create policy "lessons_select_visible"
  on public.lessons
  for select
  using (
    auth.role() = 'authenticated'
    and exists (
      select 1
      from public.modules m
      join public.courses c on c.id = m.course_id
      where m.id = lessons.module_id
        and public.course_is_visible(c)
    )
  );
