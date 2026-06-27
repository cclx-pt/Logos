-- V2.5 - direito ao apagamento (RGPD art. 17): self-service de eliminacao de conta.
--
-- Modelo: o utilizador autenticado chama delete_own_account() (via rpc com a sua
-- propria sessao). A funcao apaga SO os dados do caller, resolvidos por auth.uid()
-- - nunca aceita um id de alvo, logo nao ha vetor para apagar a conta de outrem.
--
-- Ordem de eliminacao: profiles.external_auth_id -> auth.users tem ON DELETE
-- RESTRICT (ver 20260514002002). Por isso apaga-se primeiro a row de profiles e
-- so depois a row de auth.users. Quando existirem tabelas de dominio a apontar
-- para profiles.id (V3: user_tags, lesson_completions...) devem ter ON DELETE
-- CASCADE para que este delete as arraste; hoje so profiles existe no dominio.
--
-- Seguranca:
--   - SECURITY DEFINER com search_path fixo (sem hijack de search_path).
--   - Sem parametros: a chave e sempre auth.uid(), nunca controlada pelo cliente.
--   - EXECUTE revogado de public/anon e concedido SO a authenticated: um visitante
--     nao autenticado nao tem nada para apagar e nao deve poder chamar.

create or replace function delete_own_account()
  returns void
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Sem sessao: delete_own_account() exige um utilizador autenticado.';
  end if;

  -- Apaga o profile do caller (RLS e bypassed pelo owner da funcao). Quando V3
  -- adicionar tabelas a apontar para profiles.id, o ON DELETE CASCADE delas trata
  -- da limpeza em cadeia a partir daqui.
  delete from profiles where external_auth_id = v_uid;

  -- So agora a row de auth.users deixa de ter o RESTRICT do FK a bloquea-la.
  -- O cascade interno do schema auth limpa sessoes/identities associadas.
  delete from auth.users where id = v_uid;
end;
$$;

comment on function delete_own_account() is
  'RGPD art. 17: apaga a conta do utilizador autenticado (profiles + auth.users), resolvida por auth.uid(). SECURITY DEFINER, sem parametros (nao apaga contas de terceiros), EXECUTE so para authenticated.';

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
