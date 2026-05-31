-- V2.5 hardening - rate limiting backed por Postgres (sem dependencias novas).
--
-- Modelo: contador fixed-window por chave. A app passa uma chave derivada do IP
-- (ex.: 'signin:<ip>'), o max e a janela. check_rate_limit() incrementa de forma
-- atomica e devolve true (permitido) ou false (bloqueado).
--
-- Seguranca:
--   - A tabela tem RLS sem policies: nenhum cliente lhe toca directamente.
--   - check_rate_limit() e SECURITY DEFINER mas EXECUTE e revogado de
--     anon/authenticated/public e concedido SO a service_role. Razao: a chave e
--     controlada por quem chama; se a funcao fosse chamavel por clientes, um
--     atacante podia inflacionar o contador da chave-IP de uma vitima e causar
--     DoS dirigido ao login dela. So o servidor (service role) pode chamar.
--   - Fail-open na app (se o service role nao estiver configurado ou a DB falhar,
--     nao bloqueamos) - disponibilidade acima de um controlo de baixo valor.

create table rate_limit (
  key text primary key,
  window_start timestamptz not null default now(),
  count int not null default 0
);

comment on table rate_limit is
  'Contadores fixed-window de rate limiting. Escrita exclusiva via check_rate_limit() (SECURITY DEFINER, service_role). RLS sem policies bloqueia acesso directo de clientes.';

alter table rate_limit enable row level security;

create or replace function check_rate_limit(p_key text, p_max int, p_window_seconds int)
  returns boolean
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz;
  v_count int;
begin
  -- Chave invalida: fail-open (nao bloquear).
  if p_key is null or length(p_key) = 0 or length(p_key) > 200 then
    return true;
  end if;

  select window_start, count into v_window_start, v_count
  from rate_limit where key = p_key for update;

  if not found then
    insert into rate_limit (key, window_start, count) values (p_key, v_now, 1)
    on conflict (key) do update set count = rate_limit.count + 1;
    -- Prune oportunistico para a tabela nao crescer indefinidamente (sem cron).
    if random() < 0.005 then
      delete from rate_limit where window_start < v_now - interval '1 day';
    end if;
    return true;
  end if;

  -- Janela expirou: reinicia.
  if v_now - v_window_start >= make_interval(secs => p_window_seconds) then
    update rate_limit set window_start = v_now, count = 1 where key = p_key;
    return true;
  end if;

  -- Dentro da janela e abaixo do limite: incrementa e permite.
  if v_count < p_max then
    update rate_limit set count = v_count + 1 where key = p_key;
    return true;
  end if;

  -- Dentro da janela e no limite: bloqueia (nao incrementa).
  return false;
end;
$$;

comment on function check_rate_limit(text, int, int) is
  'Rate limiter fixed-window atomico. Devolve false quando a chave excede p_max dentro de p_window_seconds. SECURITY DEFINER + EXECUTE so para service_role (chave nao e confiavel se vier de cliente).';

revoke execute on function public.check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int) to service_role;
