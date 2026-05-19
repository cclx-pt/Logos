-- Remove a coluna `tags.slug`.
--
-- Decisão (20-05-2026): tags nunca aparecem em URLs públicas — são
-- referenciadas por UUID internamente. O `label` chega para identificar a
-- etiqueta na UI admin. Manter um slug kebab-case estável era fricção
-- desnecessária no fluxo de criação.
--
-- Efeito: `drop column` também remove o índice UNIQUE implícito e a CHECK
-- constraint do regex/length. RLS, função `current_profile_has_tag(uuid[])`
-- e `user_tags` ficam intactos — não dependiam de `slug`.

alter table public.tags drop column slug;

comment on table public.tags is
  'Catálogo de etiquetas Logos. Em V3 PR2, cursos podem restringir visibilidade exigindo intersecção entre as suas required_tags e as tags do utilizador. Apenas super_admin cria/edita/apaga. Identificação interna por id (uuid); UI mostra label.';
