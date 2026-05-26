-- Reforça a política SELECT do bucket `lesson-pdfs`.
--
-- Estado anterior (migration 20260519020000_v3_courses_schema_and_storage.sql):
--   "lesson_pdfs_select_authenticated" permitia a qualquer profile
--   autenticado ler qualquer objecto do bucket. A fronteira fina (saber
--   se o user pode ver este PDF específico) vivia apenas na Server Action
--   `getLessonPdfSignedUrlAction` (src/lib/courses/access-actions.ts).
--
-- Problema: o cliente Supabase no browser usa anon key + sessão do user
-- e pode chamar `storage.from('lesson-pdfs').createSignedUrl(...)` ou
-- `.download(...)` directamente, contornando a Server Action. O path
-- `<courseId>/<lessonId>.pdf` é determinístico e os UUIDs aparecem em URLs
-- públicas (`/conteudos/[courseId]/[lessonId]`) — portanto é reconstruível.
-- Para cursos com `required_tags` (V3+) ou drafts, isto é uma fuga real.
--
-- Solução (alinhada com "RLS é última linha de defesa" do CLAUDE.md):
--   policy SELECT extrai o `courseId` do path via `split_part` e valida
--   visibilidade via `course_is_visible(courses)` — o mesmo helper que
--   protege `lessons_select_visible`. SECURITY DEFINER no helper evita
--   recursão de RLS na sub-query de `courses`.
--
-- Policies de INSERT/UPDATE/DELETE (admin-only) ficam intactas.

drop policy if exists "lesson_pdfs_select_authenticated" on storage.objects;

create policy "lesson_pdfs_select_visible"
  on storage.objects
  for select
  using (
    bucket_id = 'lesson-pdfs'
    and exists (
      select 1
      from public.courses c
      where c.id::text = split_part(storage.objects.name, '/', 1)
        and course_is_visible(c)
    )
  );
