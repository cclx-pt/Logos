-- V2 PR2 — Fix #2: eliminar recursão da policy SELECT em profiles.
--
-- Contexto:
--   A migration 20260514022124 fez current_profile_id() SECURITY DEFINER,
--   o que resolveu *uma* recursão. Mas o E2E manual mostrou que a policy
--   `profiles_select_own_or_super_admin` continua a rebentar com
--   `infinite recursion detected in policy for relation "profiles"` —
--   porque a própria policy contém `or exists (select 1 from profiles me
--   where me.role = 'super_admin')`. Esse sub-select corre no contexto
--   do user (não numa função SECURITY DEFINER), portanto re-dispara a
--   policy → recursão.
--
-- Fix:
--   1. Nova função `current_profile_role()` SECURITY DEFINER que devolve
--      o role do user actual sem passar por RLS.
--   2. Drop + recreate da policy a usar a função em vez do sub-select.
--      Resultado equivalente em semântica, sem queries em profiles dentro
--      da policy.
--
-- Segurança:
--   `current_profile_role()` apenas devolve o role do user autenticado
--   actual (lookup por `auth.uid()` que vem do JWT). Não aceita input do
--   user. SECURITY DEFINER + `set search_path = public` previne hijack
--   por schema malicioso.

create or replace function current_profile_role() returns text
  language sql
  stable
  security definer
  set search_path = public
as $$
  select role from profiles where external_auth_id = auth.uid()
$$;

comment on function current_profile_role() is
  'Devolve o role do utilizador autenticado actual. SECURITY DEFINER para evitar recursão RLS quando usado dentro de policies de profiles.';

drop policy if exists "profiles_select_own_or_super_admin" on profiles;

create policy "profiles_select_own_or_super_admin"
  on profiles
  for select
  using (
    id = current_profile_id()
    or current_profile_role() = 'super_admin'
  );
