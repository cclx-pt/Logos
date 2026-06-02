-- V2.5 hardening - fechar a superficie de UPDATE em profiles.
--
-- Problema (encontrado em revisao adversarial):
--   A policy `profiles_update_own` (migration 20260514002002) autoriza a LINHA
--   (id = current_profile_id()) mas a RLS do Postgres nao consegue restringir
--   QUE COLUNAS mudam. O trigger de 030344 ja protege `role`, mas `external_auth_id`
--   e `display_name` ficavam livremente escreviveis por qualquer utilizador
--   autenticado a chamar directamente a REST API do PostgREST (publishable key +
--   o seu proprio JWT), sem passar pelas Server Actions.
--
--   `external_auth_id` e a unica ponte para o sistema de identidade externo
--   (CLAUDE.md: "FKs nunca apontam para auth.users... a unica ligacao vive em
--   profiles.external_auth_id"). Nunca deve ser escrivel por um cliente.
--
-- Fix (duas camadas):
--   1. DROP da policy `profiles_update_own`. Nada na app (V2/V2.5) precisa que um
--      utilizador faca UPDATE do proprio profile - /perfil e so leitura e o
--      display_name vem do trigger de criacao. Sem esta policy, um utilizador
--      normal deixa de ter QUALQUER policy de UPDATE em profiles -> a RLS nega o
--      PATCH directo. (Reintroduzir com column allowlist em V3+ se/quando a edicao
--      de perfil for entregue.)
--   2. Estender o trigger BEFORE UPDATE para tornar `id` e `external_auth_id`
--      imutaveis sempre que a mudanca venha de um contexto autenticado
--      (current_profile_id() nao-nulo). Contextos de sistema (service role / SQL
--      admin como postgres, onde current_profile_id() e nulo) continuam a poder
--      alterar - necessario para o bootstrap e para a futura migracao da shell
--      CCLX. Cobre tambem o caminho do super_admin (que nao deve reescrever pontes
--      de identidade pela UI) e o bypass por service-role na API.
--
-- Pre-requisito de ordem: corre depois de 20260514030344 (cria a funcao) e de
-- 20260530150000 (revoke). CREATE OR REPLACE preserva os grants ja revogados.

drop policy if exists "profiles_update_own" on profiles;

create or replace function enforce_profiles_role_mutation_authority()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- Colunas de identidade imutaveis a partir de qualquer contexto autenticado.
  if (NEW.id is distinct from OLD.id
      or NEW.external_auth_id is distinct from OLD.external_auth_id) then
    if current_profile_id() is not null then
      raise exception 'As colunas id e external_auth_id de profiles nao sao alteraveis.'
        using errcode = '42501';
    end if;
  end if;

  -- Autoridade sobre mutacao de role (inalterado de 20260514030344).
  if NEW.role is distinct from OLD.role then
    if coalesce(current_profile_role(), '') <> 'super_admin' then
      raise exception 'Apenas super_admin pode alterar o papel de um utilizador.'
        using errcode = '42501';
    end if;
    if OLD.role = 'super_admin' then
      raise exception 'Não é permitido alterar o papel de um super_admin via UI.'
        using errcode = '42501';
    end if;
    if NEW.role not in ('user', 'admin') then
      raise exception 'Apenas user e admin são valores válidos via UI (recebido: %).', NEW.role
        using errcode = '22023';
    end if;
  end if;

  return NEW;
end;
$$;

-- Defensivo: reassegurar que a funcao (recriada acima) nao fica chamavel via RPC.
revoke execute on function public.enforce_profiles_role_mutation_authority() from public, anon, authenticated;
