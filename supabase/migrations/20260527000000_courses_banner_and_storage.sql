-- V3.2 PR1 — Banner image opcional em cursos.
--
-- Objectivo:
--   Permitir cada curso ter uma imagem banner (JPEG/PNG/WebP) que substitui
--   o ícone Lucide nas listagens e ganha destaque na landing page do curso.
--   O ícone continua obrigatório como fallback (cursos legacy ou enquanto
--   o banner ainda está a carregar).
--
-- Decisões (sessão 27-05-2026):
--   - banner opcional + icon fallback (campo nullable).
--   - storage privado: bucket `course-banners` com signed URL gerada em
--     server-side. Coerente com bucket `lesson-pdfs`. A visibilidade do
--     *curso* (RLS + tags + futuro prerequisite) é que manda — não há
--     "banner público para promover curso fechado".
--   - RLS por path desde o início (lição da migration
--     20260521000000 que reforçou `lesson-pdfs`): policy SELECT extrai
--     `courseId` do path via `split_part` e valida via
--     `course_is_visible(courses)`. Fecha o canal directo cliente →
--     Storage.
--   - Path convention `<courseId>/banner` (sem extensão; MIME servido
--     pelo header Content-Type da response). Um único objecto por curso,
--     upsert no upload — sem ficheiros órfãos com extensões diferentes.

-- =============================================================================
-- 1. Coluna banner_storage_path
-- =============================================================================

alter table courses
  add column banner_storage_path text;

comment on column courses.banner_storage_path is
  'Caminho relativo dentro do bucket `course-banners` (convenção: `<id>/banner`, sem extensão — MIME via Content-Type header). Nullable: se NULL, UI cai no `icon` como fallback. Path é security-sensitive: a policy `course_banners_select_visible` faz parsing do prefixo (split_part) para validar visibilidade do curso.';

-- =============================================================================
-- 2. Bucket course-banners
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-banners',
  'course-banners',
  false,
  5 * 1024 * 1024,  -- 5 MB por banner; suficiente para JPEG/WebP optimizados a 1920×1080.
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- =============================================================================
-- 3. Storage policies — course-banners
-- =============================================================================

-- SELECT por path: extrai courseId do prefixo do path e valida visibilidade
-- via `course_is_visible(courses)`. Mesmo padrão de
-- `lesson_pdfs_select_visible` (migration 20260521000000). Fecha o canal
-- directo cliente → Storage (anon key + sessão de user já não consegue
-- `createSignedUrl` ou `download` para banners de cursos invisíveis).
create policy "course_banners_select_visible"
  on storage.objects
  for select
  using (
    bucket_id = 'course-banners'
    and exists (
      select 1
      from public.courses c
      where c.id::text = split_part(storage.objects.name, '/', 1)
        and course_is_visible(c)
    )
  );

create policy "course_banners_insert_admin"
  on storage.objects
  for insert
  with check (
    bucket_id = 'course-banners'
    and current_profile_role() in ('admin', 'super_admin')
  );

create policy "course_banners_update_admin"
  on storage.objects
  for update
  using (
    bucket_id = 'course-banners'
    and current_profile_role() in ('admin', 'super_admin')
  )
  with check (
    bucket_id = 'course-banners'
    and current_profile_role() in ('admin', 'super_admin')
  );

create policy "course_banners_delete_admin"
  on storage.objects
  for delete
  using (
    bucket_id = 'course-banners'
    and current_profile_role() in ('admin', 'super_admin')
  );
