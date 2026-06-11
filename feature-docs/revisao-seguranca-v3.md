# Revisão de segurança V3 (pré-lançamento)

> **Data:** 11-06-2026 · **Âmbito:** estado final de `v3-cursos` antes do merge para `main` (01-07-2026).
> **Método:** `pnpm audit` (deps) + Supabase security advisors (`logos-dev`) + revisão de column-scoping das policies UPDATE de RLS + revisão do código de auth novo desta semana (route handler de login, `origin.ts`, OTP).

## Resumo

| # | Achado | Gravidade | Ação |
|---|---|---|---|
| 1 | 4 vulns `hono` (transitiva do CLI `shadcn`) | Moderate (tooling, não runtime) | pnpm override `hono>=4.12.21`; `shadcn` movido para devDependencies. Audit a zero. |
| 2 | `count_registered_users()` executável por `anon` via RPC | Baixa (gate interno já devolve NULL a não-admins) | REVOKE de `public`/`anon`; mantém `authenticated` (o dashboard chama via `.rpc()`). Migration `20260611120000`. |
| 3 | `course_access_log_update_own` sem column-scoping | Média-baixa (utilizador podia falsificar `course_id`/`accessed_at` da própria row via REST) | REVOKE UPDATE de tabela + GRANT só na coluna `unenrolled_at` (a única que a app escreve - `enrollment.ts`). Migration `20260611120000`. |
| 4 | `set_updated_at()` sem `search_path` fixo (lint 0011) | Baixa (corpo só usa NEW + now()) | `alter function ... set search_path = ''`. Migration `20260611120000`. |

## Verificado e OK (sem ação)

- **Column-scoping de `profiles`**: já resolvido na V2.5 (`20260530160000`) - policy `update_own` removida, trigger torna `id`/`external_auth_id` imutáveis e guarda `role`. A policy `profiles_update_super_admin` que resta é column-guarded pelo mesmo trigger.
- **Policies UPDATE de conteúdo** (`courses`/`modules`/`lessons`/`tags`/storage): admin/super_admin only, papéis de confiança - sem necessidade de column-scoping.
- **`lesson_views`**: INSERT own + SELECT admin, sem UPDATE/DELETE (log imutável) ✓.
- **Código de auth novo** (PR #50): route handler `/auth/login/[provider]` valida provider contra o registry, `next` via `safeNextPath`, origin via allowlist (`origin.ts`, com testes de host-injection); OTP com mensagens genéricas anti-enumeration; CSP com wildcard `*.supabase.co` documentado.

## Falsos-positivos dos advisors, aceites e documentados

(Racional completo na migration `20260611120000` e em `20260530150000`.)

- `course_is_visible()` / `current_profile_has_tag()` executáveis por **anon**: as policies RLS da landing anónima (V3.3 PR8) precisam delas; revogar partia o catálogo anónimo. Via RPC devolvem booleanos sobre o próprio caller - sem fuga.
- `current_profile_id()` / `current_profile_role()` para **authenticated**: necessárias às policies RLS (decisão V2.5).
- `delete_own_account()` para **authenticated**: é o propósito (RGPD).
- `rate_limit` com RLS e zero policies (INFO): deny-all deliberado para clients.
- "Leaked password protection disabled": **N/A** - a plataforma não tem palavras-passe (Google OAuth + email OTP).

## Estado da migration

`supabase/migrations/20260611120000_security_review_hardening.sql` - 4 statements idempotentes (REVOKE/GRANT/ALTER). **Aplicação a `logos-dev` + registo da versão no ledger** segue o procedimento anti-divergência (ver MEMORY "Divergência de migrações Supabase"). No lançamento sobe a `logos-prod` com as restantes de V3.
