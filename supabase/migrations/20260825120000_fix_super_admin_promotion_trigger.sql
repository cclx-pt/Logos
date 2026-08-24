-- Fix - repor a promocao a super_admin pela UI (regressao de merge entre ramos).
--
-- Problema:
--   `20260530120000_allow_super_admin_promotion.sql` alargou o trigger
--   `enforce_profiles_role_mutation_authority` para aceitar 'super_admin' como
--   NEW.role. Esse ficheiro foi escrito no ramo v3-cursos (merge 28-06) mas com
--   timestamp 20260530**12**0000.
--
--   `20260530160000_profiles_update_lockdown.sql` veio do ramo v2.5-copy-ux
--   (merge 02-06) com timestamp 20260530**16**0000 - ou seja, ORDENA DEPOIS. Fez
--   `create or replace function` a partir da versao de 20260514030344 (a unica
--   que existia no seu ramo), acrescentando a imutabilidade de id/external_auth_id
--   mas repondo `NEW.role not in ('user', 'admin')`.
--
--   Resultado na base de dados: a versao 160000 e a que vive no Postgres, e
--   qualquer promocao a super_admin via /admin/utilizadores falha com
--   "Apenas user e admin sao valores validos via UI (recebido: super_admin)"
--   (errcode 22023). A UI mostra so `?erro=generico`, o que escondeu a causa.
--
-- Fix:
--   Uma unica versao da funcao que junta as DUAS garantias, para nao voltar a
--   perder nenhuma num futuro replace:
--     1. id e external_auth_id imutaveis a partir de contexto autenticado
--        (de 20260530160000);
--     2. role so mutavel por super_admin, nunca sobre um super_admin existente,
--        e com 'super_admin' entre os valores validos (de 20260530120000).
--
-- Democao de um super_admin continua a ser so por SQL directo - intencional,
-- evita lock-out acidental (ver feature-docs/auth-architecture.md).

create or replace function enforce_profiles_role_mutation_authority()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  -- (1) Colunas de identidade imutaveis a partir de qualquer contexto autenticado.
  --     Contextos de sistema (service role / postgres, onde current_profile_id()
  --     e nulo) continuam a poder alterar - necessario para bootstrap e para a
  --     futura migracao para a shell CCLX.
  if (NEW.id is distinct from OLD.id
      or NEW.external_auth_id is distinct from OLD.external_auth_id) then
    if current_profile_id() is not null then
      raise exception 'As colunas id e external_auth_id de profiles nao sao alteraveis.'
        using errcode = '42501';
    end if;
  end if;

  -- (2) Autoridade sobre mutacao de role.
  if NEW.role is distinct from OLD.role then
    if coalesce(current_profile_role(), '') <> 'super_admin' then
      raise exception 'Apenas super_admin pode alterar o papel de um utilizador.'
        using errcode = '42501';
    end if;
    if OLD.role = 'super_admin' then
      raise exception 'Não é permitido alterar o papel de um super_admin via UI.'
        using errcode = '42501';
    end if;
    if NEW.role not in ('user', 'admin', 'super_admin') then
      raise exception 'Papel inválido via UI (recebido: %).', NEW.role
        using errcode = '22023';
    end if;
  end if;

  return NEW;
end;
$$;

comment on function enforce_profiles_role_mutation_authority() is
  'Trigger BEFORE UPDATE em profiles: (a) id e external_auth_id imutaveis a partir de contexto autenticado; (b) mutacoes de role so por super_admin, nunca sobre um super_admin existente (democao fica so-SQL), valor em {user, admin, super_admin}. SECURITY DEFINER para consultar current_profile_role() de forma estavel.';

-- Defensivo: reassegurar que a funcao recriada nao fica chamavel via RPC
-- (o grant default de EXECUTE volta com o create or replace).
revoke execute on function public.enforce_profiles_role_mutation_authority() from public, anon, authenticated;
