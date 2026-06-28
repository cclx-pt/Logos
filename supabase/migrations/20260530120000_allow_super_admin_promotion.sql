-- V3 (pull-forward) — permitir promoção a super_admin pela UI.
--
-- Contexto:
--   A migration 20260514030344 fez o trigger `enforce_profiles_role_mutation_authority`
--   bloquear qualquer `NEW.role` fora de {'user','admin'} — promoção a super_admin
--   era só por SQL directo. O utilizador pediu que um super_admin possa promover
--   outro utilizador a super_admin pela UI (/admin/utilizadores).
--
-- Mudança:
--   `NEW.role` passa a aceitar também 'super_admin'. As outras garantias mantêm-se:
--     (a) só um super_admin pode mudar papéis;
--     (b) NÃO se pode alterar o papel de um super_admin já existente via UI
--         (OLD.role = 'super_admin' continua bloqueado) — evita despromoção/lock-out
--         acidental; demoção de super_admin continua a ser só por SQL directo.
--
-- A policy `profiles_update_super_admin` (mesma migration de 2026-05-14) já permite
-- a super_admin escrever em linhas alheias, por isso não muda nada aqui.

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
    if NEW.role not in ('user', 'admin', 'super_admin') then
      raise exception 'Papel inválido via UI (recebido: %).', NEW.role
        using errcode = '22023';
    end if;
  end if;
  return NEW;
end;
$$;

comment on function enforce_profiles_role_mutation_authority() is
  'Trigger BEFORE UPDATE em profiles: mutações de role só por super_admin, nunca sobre um super_admin existente (demoção fica só-SQL), e valor em {user, admin, super_admin}. SECURITY DEFINER para consultar current_profile_role() de forma estável.';
