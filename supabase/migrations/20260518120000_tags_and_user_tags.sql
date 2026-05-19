-- V3 PR1 — Etiquetas (fundação).
--
-- Objectivo:
--   Introduzir o sistema de etiquetas (`tags`) e a atribuição de etiquetas a
--   utilizadores (`user_tags`). Em V3 PR2, `courses.required_tags` (uuid[]) e
--   um helper `current_profile_has_tag(uuid[])` STABLE são usados para
--   tornar cursos restritos invisíveis a quem não tem a etiqueta certa
--   (CLAUDE.md §🚫: "Conteúdo restrito por etiqueta é invisível").
--
-- Decisões fechadas (v3-plan.md §1, confirmadas com o user em 18-05-2026):
--   - `tags`: id, slug unique, label, created_by, created_at — sem description
--     (entra em V4 se a UI precisar de explicações).
--   - `user_tags`: PK composta (user_id, tag_id); assigned_by para auditoria.
--   - RLS escrita em tags: **apenas super_admin** (governança do projeto).
--     Atribuir a utilizadores (user_tags) é admin + super_admin.
--   - User só lê as etiquetas que **possui** (não vê o catálogo todo). Isto
--     mantém a invisibilidade — utilizadores não sabem que etiquetas existem
--     fora das suas.
--
-- Padrões herdados:
--   - FKs apontam para `profiles.id` (nunca `auth.users`) — CLAUDE.md §🚫.
--   - Policies escrevem-se contra `current_profile_id()` / `current_profile_role()`
--     (definidas em 20260514002002 e 20260514022734). Quando a identidade migrar
--     para a shell CCLX, substitui-se a impl dessas funções; as policies não mudam.
--   - on delete restrict em created_by/assigned_by para preservar auditoria
--     (alinhado com profiles.external_auth_id em 20260514002002).
--   - on delete cascade em user_id/tag_id porque a atribuição não faz sentido
--     sem o utilizador ou a etiqueta.

create table tags (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 2 and 64),
  label text not null check (length(label) between 1 and 80),
  created_by uuid not null references profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

comment on table tags is
  'Catálogo de etiquetas Logos. Em V3 PR2, cursos podem restringir visibilidade exigindo intersecção entre as suas required_tags e as tags do utilizador. Apenas super_admin cria/edita/apaga.';

comment on column tags.slug is
  'Identificador estável kebab-case. Usado em URLs internas e como chave humana. Min 2 / max 64 chars, [a-z0-9-].';

comment on column tags.label is
  'Nome visível na UI admin (PT-PT). Editável; não é identificador.';

create table user_tags (
  user_id uuid not null references profiles(id) on delete cascade,
  tag_id uuid not null references tags(id) on delete cascade,
  assigned_by uuid not null references profiles(id) on delete restrict,
  assigned_at timestamptz not null default now(),
  primary key (user_id, tag_id)
);

comment on table user_tags is
  'Atribuição de etiquetas a utilizadores. PK composta evita duplicados. assigned_by preserva auditoria (super_admin pode ver quem atribuiu). Cascade em user_id/tag_id porque a atribuição não tem sentido sem ambos os lados.';

create index user_tags_tag_id_idx on user_tags (tag_id);

-- Helper para V3 PR2 (RLS de courses). Devolve true se o user actual tem pelo
-- menos uma das etiquetas no array. Array vazio → false (caller decide o que
-- significa: courses.required_tags = '{}' OR current_profile_has_tag(...)).
-- SECURITY DEFINER + STABLE pelo mesmo motivo de current_profile_role(): evita
-- recursão RLS quando usado dentro de policies que tocam em profiles/user_tags
-- (ver 20260514022734).
create or replace function current_profile_has_tag(required uuid[]) returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from user_tags ut
    where ut.user_id = current_profile_id()
      and ut.tag_id = any(required)
  )
$$;

comment on function current_profile_has_tag(uuid[]) is
  'Devolve true se o utilizador autenticado tem pelo menos uma das tags no array. Array vazio devolve false; políticas que queiram "visível a todos quando vazio" devem fazer required_tags = ''{}'' OR current_profile_has_tag(required_tags). SECURITY DEFINER previne recursão RLS.';

-- RLS em tags.
alter table tags enable row level security;

-- SELECT: admin/super_admin vê o catálogo todo; user vê apenas as suas
-- (subquery via user_tags, que tem a sua própria policy SELECT compatível).
create policy "tags_select_admin_or_own"
  on tags
  for select
  using (
    current_profile_role() in ('admin', 'super_admin')
    or id in (
      select tag_id from user_tags where user_id = current_profile_id()
    )
  );

-- INSERT/UPDATE/DELETE: só super_admin. Defesa em profundidade — a Server
-- Action também valida o role do caller.
create policy "tags_insert_super_admin"
  on tags
  for insert
  with check (current_profile_role() = 'super_admin');

create policy "tags_update_super_admin"
  on tags
  for update
  using (current_profile_role() = 'super_admin')
  with check (current_profile_role() = 'super_admin');

create policy "tags_delete_super_admin"
  on tags
  for delete
  using (current_profile_role() = 'super_admin');

-- RLS em user_tags.
alter table user_tags enable row level security;

-- SELECT: utilizador vê as suas atribuições; admin/super_admin vê tudo.
create policy "user_tags_select_own_or_admin"
  on user_tags
  for select
  using (
    user_id = current_profile_id()
    or current_profile_role() in ('admin', 'super_admin')
  );

-- INSERT/DELETE: admin + super_admin. (Não há UPDATE porque a tabela é só
-- atribuição binária — assignar/desassignar é insert/delete.)
create policy "user_tags_insert_admin"
  on user_tags
  for insert
  with check (current_profile_role() in ('admin', 'super_admin'));

create policy "user_tags_delete_admin"
  on user_tags
  for delete
  using (current_profile_role() in ('admin', 'super_admin'));
