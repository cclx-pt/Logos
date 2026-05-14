-- V2 PR2 — Fix: current_profile_id() passa a SECURITY DEFINER.
--
-- Problema (descoberto no E2E manual da V2 PR2):
--   A migration original 20260514002002 criou current_profile_id() com
--   `security invoker` + a policy `profiles_select_own_or_super_admin` em
--   `profiles` chama essa função → quando uma query a `profiles` dispara
--   a policy, a sub-query interna da função (`select id from profiles
--   where external_auth_id = auth.uid()`) também passa pela policy →
--   Postgres detecta `infinite recursion detected in policy for relation
--   "profiles"` e devolve erro.
--
-- Fix:
--   `SECURITY DEFINER` faz a função correr com privilégios do owner
--   (postgres), bypassando RLS na query interna. Quebra a recursão.
--
-- Segurança:
--   A função apenas faz `select id from profiles where external_auth_id =
--   auth.uid()` — só devolve o profile.id correspondente ao utilizador
--   autenticado. `auth.uid()` continua a vir do JWT do request, não pode
--   ser falsificado. Não há query parametrizada por input do user; nada
--   pode ser injectado.
--
-- `set search_path = public` (preservado) impede que um schema malicioso
--   no search_path do caller intercepte a tabela `profiles`.

alter function current_profile_id() security definer;

comment on function current_profile_id() is
  'Devolve o profiles.id do utilizador autenticado actual via lookup external_auth_id = auth.uid(). SECURITY DEFINER para quebrar recursão RLS — a policy em profiles usa esta função, e SECURITY INVOKER fazia a sub-query interna re-disparar a policy.';
