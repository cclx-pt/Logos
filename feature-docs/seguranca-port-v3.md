# Port do hardening de segurança V2.5 para `v3-cursos`

> **Versão:** V3 (port de V2.5) · **Concluída em:** 02-06-2026 · **Autor(es):** João Ribeiro (assistido por Claude Code)

## Porquê

A V2.5 (agora em produção via `main`) levou um bloco de hardening de segurança. A `v3-cursos` saiu de `31e8a4a` **antes** desse trabalho, por isso não o tinha. Este port traz **apenas a segurança** (não o RGPD nem o copy/UX da V2.5) para a linha de V3, para que o lançamento de V3 não regrida em segurança face ao que já está em prod.

## O que foi portado (4 commits de segurança, cherry-pick)

| Commit origem | Conteúdo |
|---|---|
| `e479960` | Headers HTTP de segurança + REVOKE EXECUTE nos helpers SECURITY DEFINER |
| `d19705d` | Patch Next CVEs (16.2.4 -> 16.2.6) + overrides pnpm + CSP enforcing + host allowlist + lockdown UPDATE de `profiles` |
| `6c1d8e1` | Fix de open-redirect no `next` (`src/lib/auth/redirect.ts`) + hardening de `getOrigin` (host-header injection) + limite de payload de Server Actions |
| `50a5ab5` | Rate limiter fixed-window em Postgres (`check_rate_limit`) |

**Deliberadamente fora:** `52c3bb7` e `55d181f` (RGPD: privacidade, apagar conta, consentimento) — não são segurança.

## Reconciliações feitas no merge

- **`next.config.ts`** — a v3 já tinha `experimental` (bodySizeLimit 25mb p/ upload de PDFs + `viewTransition`). O merge juntou os headers/CSP de segurança a esse bloco. O auto-merge deixou dois blocos `experimental` (chave duplicada); foi fundido num só.
- **`bodySizeLimit`** — a V2.5 fixava 64kb (sem uploads). A v3 precisa de 25mb (createLessonAction, PDFs até 20MB). Como o `bodySizeLimit` do Next é **global** (não por-action), não dá para manter os 64kb sem partir o upload. Fica em 25mb — exatamente a reconciliação que a nota da V2.5 antecipava.
- **`src/lib/auth/actions.ts`** — a v3 tinha a feature de `next`-redirect (`safeNext`). O port substituiu-a pela versão endurecida (`safeNextPath` em `redirect.ts` + allowlist de host). Feature preservada, agora segura.

## Verificação de paridade com prod

Confirmado `git diff origin/main HEAD` **idêntico** em: as 3 migrações de segurança, `redirect.ts`, `redirect.test.ts`, `auth/callback/route.ts`, e o bloco CSP+headers do `next.config.ts`. Pipeline: typecheck + lint limpos, 422/422 testes verdes.

## ⚠️ Caveat: divergência de versões de migração (resolver antes de `db push`)

As migrações de segurança **já estão aplicadas em `logos-dev`** (objetos confirmados: `check_rate_limit`, política UPDATE de `profiles`, REVOKE dos helpers). Mas foram aplicadas via MCP `apply_migration`, que auto-versiona — logo as versões registadas em `schema_migrations` **divergem** dos nomes dos ficheiros (que seguem `main`):

| Ficheiro no repo (= `main`) | Versão registada em `logos-dev` |
|---|---|
| `20260530150000_revoke_execute_on_security_definer_helpers.sql` | `20260530214607` |
| `20260530160000_profiles_update_lockdown.sql` | `20260530220850` |
| `20260530170000_rate_limit.sql` | `20260530225823` |

**Risco:** a migração `rate_limit` faz `create table rate_limit` **sem `if not exists`**. Um `supabase db push` a partir de `v3-cursos` veria a `170000` como por-aplicar (versão ausente do ledger) e **falharia** ao recriar a tabela. As outras duas são idempotentes (REVOKE/GRANT, `drop policy if exists` + `create or replace`).

**Resolução aplicada (02-06-2026):** reconciliado o `supabase_migrations.schema_migrations` de `logos-dev` para os nomes dos ficheiros (`214607`->`150000`, `220850`->`160000`, `225823`->`170000`) via UPDATE com condição por `name`, dentro de transação. Mudança só de metadados (não toca no schema; os objetos já existiam). Repo (= `main`) e ledger de `logos-dev` ficam alinhados, logo um `supabase db push` já não tenta re-aplicar a `rate_limit`. Mesma prática usada para alinhar prod — ver `MEMORY` "Divergência de migrações Supabase".

> Nota: as restantes migrações de V3 mantêm divergência ficheiro-vs-ledger pré-existente (ex.: `allow_super_admin_promotion` ficheiro `…120000` vs ledger `…172850`). Fora do âmbito deste port; tratar na reconciliação geral antes do lançamento.

**No lançamento (01-07-2026):** estas 3 migrações já estão em `logos-prod` desde a V2.5; o processo de subida de V3 a prod tem de as saltar (não re-aplicar), tal como já acontece com as restantes migrações de V3 com versões divergentes.

## Adenda (10-06-2026): regressão de CSP nos assets do Storage

A "paridade com prod" (§acima) tinha um ponto cego: `main` não tem banners de cursos nem visualizador inline de PDF, por isso a CSP portada não contemplava o Supabase Storage. Em `v3-cursos`, `img-src` bloqueava os banners (`course-banners` via `<CourseImage>`) e `frame-src` bloqueava o iframe da sebenta (`lesson-pdfs`) - ambos servidos por signed URLs de `*.supabase.co`. Os assets "desapareciam" silenciosamente (só o console do browser acusava a violação de CSP).

**Corrigido a 10-06-2026:** wildcard `https://*.supabase.co` em `img-src` e `frame-src` (mesmo racional do `connect-src`) + teste de regressão `src/test/security-headers.test.ts` que pina as origens externas de cada directiva.

**Lição:** portar uma CSP exige reauditar as origens externas que a branch **destino** usa (storage, embeds, captcha), não só verificar paridade com a branch origem.
