-- Revisão de segurança V3 pré-lançamento (11-06-2026) - hardening pontual.
--
-- Achados da revisão (pnpm audit + Supabase security advisors + revisão de
-- column-scoping das policies UPDATE). O fix de dependências (hono, transitiva
-- do CLI shadcn) vive no package.json (pnpm override); aqui ficam os 3 fixes
-- de DB + a documentação dos falsos-positivos aceites.
--
-- 1. count_registered_users(): já tem gate interno (devolve NULL a não-admins,
--    ver 20260530130000), mas tinha EXECUTE para PUBLIC/anon via
--    /rest/v1/rpc/. Reduzimos a superfície: só authenticated (o dashboard
--    admin chama via .rpc() com o JWT do utilizador - overview-stats.ts).
-- 2. set_updated_at(): trigger sem search_path fixo (advisor lint 0011). Sem
--    vetor prático conhecido (o corpo só toca em NEW e now()), mas fixar é
--    grátis e alinha com os restantes helpers.
-- 3. course_access_log: a policy UPDATE own (V3.3 PR8, 20260529120000) limita
--    a LINHA mas não as COLUNAS - um utilizador autenticado podia reescrever
--    course_id/accessed_at da própria row via REST direto (falsificar
--    telemetria/datas de inscrição). A app só escreve unenrolled_at
--    (enrollment.ts); o grant de coluna passa a dizer exactamente isso.
--    Mesmo princípio row-auth ≠ column-auth do lockdown de profiles (160000).
--
-- Falsos-positivos dos advisors (lints 0028/0029/0008) aceites SEM ação:
--   - course_is_visible() + current_profile_has_tag() executáveis por anon:
--     são chamadas DENTRO das policies RLS de courses/modules/lessons,
--     avaliadas também pelo papel anon (landing anónima V3.3 PR8). Revogar
--     EXECUTE a anon partia o catálogo anónimo. Via RPC devolvem apenas
--     booleanos calculados sobre o próprio caller - sem fuga.
--   - current_profile_id()/current_profile_role() para authenticated:
--     necessárias às policies RLS (decisão registada em 20260530150000).
--   - delete_own_account() para authenticated: é o propósito da função (RGPD,
--     apagar a própria conta; existe em logos-dev/prod via V2.5).
--   - rate_limit com RLS ligada e zero policies (lint 0008, INFO): deliberado,
--     deny-all para clients; só check_rate_limit() (service_role) lhe toca.

-- 1. count_registered_users: fechar o RPC a anon/PUBLIC; manter authenticated.
revoke execute on function public.count_registered_users() from public, anon;
grant execute on function public.count_registered_users() to authenticated;

-- 2. search_path fixo no trigger helper (corpo só usa NEW + now(), pg_catalog).
alter function public.set_updated_at() set search_path = '';

-- 3. Column-scoping do UPDATE em course_access_log: a RLS (update own) continua
--    a dar o row-scoping; o grant de coluna acrescenta o column-scoping.
--    anon nunca deve fazer UPDATE; authenticated só pode tocar em unenrolled_at.
revoke update on table public.course_access_log from anon, authenticated;
grant update (unenrolled_at) on table public.course_access_log to authenticated;
