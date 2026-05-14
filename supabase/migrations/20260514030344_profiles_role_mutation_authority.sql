-- V2 PR3 — Profiles: autoridade sobre mutação de `role`.
--
-- Objectivo:
--   1. Permitir que super_admin actualize linhas `profiles` de outros utilizadores
--      (necessário para promover/despromover via UI em /admin/utilizadores).
--   2. Garantir que mudanças de `role` só acontecem por mãos de um super_admin,
--      e que nenhum super_admin existente é despromovido via fluxo UI/RLS.
--
-- Contexto:
--   A migration 20260514002002 deixou `profiles_update_own` (com check id =
--   current_profile_id()), que cobre o caso "user edita próprio profile" mas
--   bloqueia super_admin a tocar em linhas alheias. Faltava o lado super_admin.
--
--   RLS em Postgres não consegue, sozinha, restringir "que colunas" um update
--   toca — só "que linhas". A defesa primária contra mutações inválidas de
--   `role` continua a ser o Server Action (`setUserRoleAction` em
--   `src/app/admin/utilizadores/actions.ts`), gated por `role === 'super_admin'`.
--   Esta migration adiciona dois layers complementares:
--     - policy `profiles_update_super_admin` (permite a super_admin ver/escrever
--       em linhas alheias — necessário para a UI funcionar);
--     - trigger BEFORE UPDATE `enforce_profiles_role_mutation_authority` que,
--       quando a coluna `role` é alterada, valida que (a) o caller é super_admin,
--       (b) o alvo não é super_admin (não despromovemos via UI), (c) o novo
--       valor é 'user' ou 'admin'.
--
--   Ambos cobrem service-role-bypass também: triggers correm em service_role
--   (RLS não corre, mas o trigger sim). A única forma de mudar o role de um
--   super_admin é via SQL directo no painel — coerente com o bootstrap do
--   primeiro super_admin (ver feature-docs/auth-architecture.md §5.1).

-- Policy: super_admin pode tocar em qualquer profile via update.
-- Composição com `profiles_update_own` (OR) cobre os dois casos.
create policy "profiles_update_super_admin"
  on profiles
  for update
  using (current_profile_role() = 'super_admin')
  with check (current_profile_role() = 'super_admin');

-- Trigger: bloqueia mudanças de role que não venham de super_admin, que toquem
-- num super_admin existente, ou que ponham um valor fora de {'user','admin'}.
create or replace function enforce_profiles_role_mutation_authority()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
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

comment on function enforce_profiles_role_mutation_authority() is
  'Trigger BEFORE UPDATE em profiles: bloqueia mutações de role que não venham de super_admin, que toquem em super_admins existentes, ou que ponham valores fora de {user, admin}. SECURITY DEFINER para conseguir consultar current_profile_role() de forma estável.';

create trigger enforce_profiles_role_mutation_authority
  before update on profiles
  for each row
  execute function enforce_profiles_role_mutation_authority();
