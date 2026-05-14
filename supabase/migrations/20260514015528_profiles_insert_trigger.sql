-- V2 PR2 — Trigger defensivo: cria profile quando auth.users nasce.
--
-- Notas:
-- - SECURITY DEFINER necessário porque profiles tem RLS sem policy `for insert`
--   (ver migration 20260514002002 §81-87). Inserts só passam por: este trigger,
--   ou service role admin.
-- - `coalesce(name, full_name, email)` garante display_name não-nulo mesmo
--   que o claim Google não traga `name` (raro, mas possível).
-- - `on conflict (external_auth_id) do nothing` torna o trigger idempotente:
--   re-inserts (criação manual no dashboard, SQL admin) não duplicam.
-- - O Server Action no callback OAuth (V2 PR2) **não** insere em profiles —
--   este trigger é a única via. Decisão registada em feature-docs/v2-auth.md
--   §2 (variante "trigger DB primário", spec original era "Server Action +
--   trigger" mas o Server Action exigia service role; trigger sozinho cobre
--   100% dos caminhos incluindo criação por SQL admin).

create or replace function handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into profiles (external_auth_id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.email
    )
  )
  on conflict (external_auth_id) do nothing;
  return new;
end;
$$;

comment on function handle_new_auth_user() is
  'Cria profile quando auth.users nasce. SECURITY DEFINER porque profiles tem RLS sem policy de insert. Idempotente via on conflict do nothing.';

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_auth_user();
