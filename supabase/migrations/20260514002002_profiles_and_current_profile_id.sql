-- V2 PR1 — Foundation: profiles + current_profile_id() + RLS em profiles.
--
-- Notas:
-- - `profiles.id` é o **único** FK universal usado pelo Logos. Tudo o resto
--   aponta para aqui (ver architecture.md §2 e feature-docs/auth-architecture.md §4).
-- - `external_auth_id` aponta para `auth.users.id` (Supabase Auth). É a única
--   coluna do Logos que liga ao sistema de identidade externo. Quando a shell
--   CCLX existir, troca-se a origem deste valor (e a impl. de current_profile_id());
--   nenhuma outra tabela é afectada.
-- - `on delete restrict` em `external_auth_id` é deliberado: apagar `auth.users`
--   externamente bloqueia se há `profiles` a apontar. Preserva histórico
--   (lesson_completions, course_completions). Política de eliminação dura é
--   decisão de produto (V3+).
-- - RLS em profiles:
--   - select: utilizador vê o próprio profile; super_admins vêem todos.
--   - update: utilizador só pode tocar no próprio (e mesmo aí, mutar `role`
--     fica gated por Server Action — RLS não tem acesso fácil ao OLD vs NEW
--     role em update, portanto a defesa primária é a Server Action; em PR3
--     adiciona-se um trigger BEFORE UPDATE que bloqueia mudança de `role`
--     se não for super_admin).
-- - Sincronização auth.users → profiles (insert via Server Action + trigger DB
--   defensivo) entra na V2 PR2, não nesta.

create extension if not exists pgcrypto;

create table profiles (
  id uuid primary key default gen_random_uuid(),
  external_auth_id uuid unique not null references auth.users(id) on delete restrict,
  display_name text not null,
  role text not null default 'user' check (role in ('user', 'admin', 'super_admin')),
  created_at timestamptz not null default now()
);

comment on table profiles is
  'Fonte de verdade do utilizador no Logos. Todas as FK do domínio Logos apontam para profiles.id. external_auth_id é a única ligação ao sistema de identidade externo (hoje Supabase Auth).';

comment on column profiles.external_auth_id is
  'ID do utilizador no sistema de identidade externo. Hoje aponta para auth.users.id. Quando a shell CCLX existir, esta coluna mudará de origem — nenhuma outra tabela é afectada.';

comment on column profiles.role is
  'Papel no Logos. Fonte de verdade Logos (não migra para shell externa). Bootstrap: primeiro super_admin via supabase/seed/super-admin.sql.example após primeiro login.';

-- Função helper para RLS.
-- STABLE permite ao planeador Postgres cachear o resultado dentro de uma query.
-- Todas as policies (esta + futuras em V2 PR4, V3) escrevem-se contra
-- current_profile_id(), nunca contra auth.uid() directamente. Quando a identidade
-- mudar de origem, substitui-se a implementação desta função; as policies não mudam.
create or replace function current_profile_id() returns uuid
  language sql
  stable
  security invoker
  set search_path = public
as $$
  select id from profiles where external_auth_id = auth.uid()
$$;

comment on function current_profile_id() is
  'Devolve o profiles.id do utilizador autenticado actual via lookup external_auth_id = auth.uid(). Usado em todas as RLS policies do Logos para isolar a indirecção a um único sítio.';

-- RLS em profiles.
alter table profiles enable row level security;

create policy "profiles_select_own_or_super_admin"
  on profiles
  for select
  using (
    id = current_profile_id()
    or exists (
      select 1 from profiles me
      where me.id = current_profile_id()
        and me.role = 'super_admin'
    )
  );

create policy "profiles_update_own"
  on profiles
  for update
  using (id = current_profile_id())
  with check (id = current_profile_id());

-- Insert e delete em profiles ficam off-limits para clients via RLS:
-- - Insert: feito por Server Action no callback OAuth (V2 PR2) via service role
--   key, ou pelo trigger DB defensivo (V2 PR2). Nenhuma policy `for insert` =
--   nenhum client RLS-bound pode inserir directamente.
-- - Delete: política de eliminação dura é decisão de produto (V3+). Sem policy
--   `for delete` significa que apenas service role consegue (admin SQL).
