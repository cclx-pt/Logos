-- V2.5 hardening - REVOKE EXECUTE nos helpers SECURITY DEFINER expostos via RPC.
--
-- Contexto (Supabase security advisor, lints 0028/0029):
--   current_profile_id(), current_profile_role() e handle_new_auth_user() sao
--   SECURITY DEFINER e, por defeito, tem EXECUTE concedido a PUBLIC/anon/authenticated.
--   Isso torna-as chamaveis directamente via /rest/v1/rpc/<fn>, o que nao e
--   intencional - sao helpers internos, nao endpoints publicos.
--
-- Decisao (cada caso e diferente):
--   - handle_new_auth_user(): e funcao de TRIGGER (on_auth_user_created em
--     auth.users). A execucao do trigger NAO depende do privilegio EXECUTE do
--     papel que faz o INSERT, por isso podemos revogar EXECUTE a todos os papeis
--     de API sem partir a criacao automatica de profiles. Fechamos a exposicao
--     RPC por completo.
--   - current_profile_id() / current_profile_role(): sao chamadas DENTRO das RLS
--     policies de `profiles`, avaliadas no contexto do papel `authenticated`. Se
--     revogarmos EXECUTE a `authenticated`, um SELECT autenticado a `profiles`
--     falha com "permission denied for function" e PARTE o login. Por isso:
--       * revogamos a anon + PUBLIC (anon nunca avalia estas policies em V2);
--       * GARANTIMOS EXECUTE a authenticated (necessario para a RLS funcionar).
--     O advisor continua a assinalar EXECUTE por `authenticated` nestas duas -
--     e um falso-positivo aceite: sao helpers de RLS, nao endpoints publicos.
--
-- Idempotente: REVOKE/GRANT podem correr varias vezes sem erro. postgres e
-- service_role mantem os seus grants proprios (nao sao tocados aqui).
--
-- Pre-requisito de ordem: enforce_profiles_role_mutation_authority() e criada na
-- migration 20260514030344. Esta migration corre depois (timestamp superior).

-- Funcoes de TRIGGER (nunca chamadas via RPC pela app): fechar EXECUTE por completo.
revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.enforce_profiles_role_mutation_authority() from public, anon, authenticated;

revoke execute on function public.current_profile_id() from public, anon;
revoke execute on function public.current_profile_role() from public, anon;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_profile_role() to authenticated;
