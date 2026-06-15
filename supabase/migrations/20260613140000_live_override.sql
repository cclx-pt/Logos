-- V3.6 - Live override (interruptor admin "Estamos no ar").
--
-- Permite ligar/desligar a transmissao em direto a partir da area admin, sem
-- depender de janelas (YOUTUBE_LIVE_WINDOWS) nem de polling 24/7 a YouTube API.
-- O estado e uma unica linha: a area admin escreve-a, o servidor le-a em
-- getLiveStatus, e o Supabase Realtime empurra a mudanca para todos os
-- visitantes (o botao "Live" fica verde em <1s, sem refresh).
--
-- Porque uma tabela (e nao uma env var ou cache em memoria): em Vercel
-- serverless nao ha processo de longa duracao nem memoria partilhada; uma env
-- var exigiria redeploy. Uma linha em Postgres e partilhada, instantanea de
-- escrever e observavel via Realtime.
--
-- REGRA DURA: migrations V3 so em `logos-dev`. Nunca aplicadas a `logos-prod`
-- antes de 01-07-2026 (lancamento).

-- =============================================================================
-- 1. Tabela live_override (singleton)
-- =============================================================================

create table live_override (
  -- Singleton: uma so linha. id fixo a 1 (CHECK) - o UPDATE incide sempre nela.
  id smallint primary key default 1 check (id = 1),
  -- Interruptor principal. true = a equipa declarou "estamos no ar".
  is_live boolean not null default false,
  -- videoId YouTube da emissao em curso (resolvido por search.list ao ligar).
  -- null = ligado mas stream ainda nao detetado (o leitor mostra um spinner).
  video_id text check (video_id is null or length(video_id) between 1 and 32),
  -- Validade do "armado". Protege contra esquecimento: passado este instante,
  -- um override SEM stream verificado deixa de valer. Um stream ja confirmado
  -- em direto (videos.list, sem actualEndTime) sobrevive para alem disto.
  armed_until timestamptz,
  updated_at timestamptz not null default now()
);

comment on table live_override is
  'Interruptor unico da transmissao em direto (admin "Estamos no ar"). Lido por getLiveStatus; mudancas empurradas por Realtime. Mecanismo primario (substitui o gating por janelas). Uma so linha (id=1).';

comment on column live_override.video_id is
  'videoId YouTube da emissao em curso (resolvido por search.list ao ligar). null = ligado mas stream ainda nao detetado.';

comment on column live_override.armed_until is
  'Validade do override enquanto nao ha stream verificado. Um stream confirmado live (videos.list, sem actualEndTime) mantem-se mesmo depois desta hora.';

create trigger live_override_set_updated_at
  before update on live_override
  for each row execute function set_updated_at();

-- =============================================================================
-- 2. RLS
-- =============================================================================

alter table live_override enable row level security;

-- SELECT: publico (anon + authenticated). O estado da live e publico (aparece
-- na nav e em /live para toda a gente) e o Realtime no browser precisa de poder
-- ler a linha para entregar as mudancas.
create policy "live_override_select_public"
  on live_override
  for select
  using (true);

-- UPDATE: so admin/super_admin (row-scoping por policy). A area admin escreve
-- com a sessao do utilizador (getServerClient); a autoridade final e esta
-- policy + o column-grant abaixo, nao o codigo.
create policy "live_override_update_admin"
  on live_override
  for update
  using (current_profile_role() in ('admin', 'super_admin'))
  with check (current_profile_role() in ('admin', 'super_admin'));

-- Column-scoping: o caller so toca nestas tres colunas; updated_at e do trigger
-- (fora dos privilegios do invoker). Sem INSERT/DELETE para alem do
-- service_role/owner - a linha singleton e semeada abaixo e nunca se apaga.
revoke update on table live_override from anon, authenticated;
grant update (is_live, video_id, armed_until) on table live_override to authenticated;

-- =============================================================================
-- 3. Realtime
-- =============================================================================

-- Empurra as mudancas da linha para os clientes subscritos (botao "Live" e
-- /live). Sem isto, o Realtime no browser nao recebe eventos desta tabela.
alter publication supabase_realtime add table public.live_override;

-- =============================================================================
-- 4. Seed da linha singleton
-- =============================================================================

insert into live_override (id, is_live) values (1, false)
  on conflict (id) do nothing;
