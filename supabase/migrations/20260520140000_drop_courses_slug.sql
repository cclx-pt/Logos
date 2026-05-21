-- Remove a coluna `courses.slug`.
--
-- Decisão (20-05-2026, V3.1 iteração followup): cursos passam a ser
-- referenciados por UUID nas URLs públicas (`/conteudos/<uuid>`). Manter um
-- slug kebab-case obrigava o admin a inventar um nome estável separado do
-- título; em V3 ainda não há cursos em produção, por isso não há custo de
-- redirects. Decisão coerente com `tags` (já sem slug — migration
-- 20260520120000_drop_tags_slug.sql).
--
-- Efeito: `drop column` remove o índice UNIQUE implícito (`courses_slug_key`)
-- e a CHECK constraint que validava o regex/length do slug. RLS, helper
-- `course_is_visible(courses)`, FKs em `modules.course_id` e
-- `course_access_log.course_id` ficam intactos — não dependiam de `slug`.

alter table public.courses drop column slug;

comment on table public.courses is
  'Catálogo de cursos Logos (V3+). Visibilidade controlada pela helper course_is_visible(courses) que combina published_at + required_tags ↔ user tags. Identificação interna e em URLs públicas por id (uuid); UI mostra title.';
