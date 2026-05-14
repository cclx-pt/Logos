# V2 — Plano de implementação de autenticação e papéis

> **Estado:** PR1 ✅ + PR2 ✅ implementadas; PR3 + PR4 por implementar. Lê em paralelo `feature-docs/auth-architecture.md` (a fundação conceptual) e `feature-docs/google-oauth-setup.md` (passos no painel Google/Supabase).
> **Última atualização:** 14-05-2026

## 0. Resumo

V2 entrega 4 capacidades, em 4 PRs separadas. As PRs são desenhadas para serem **mergíveis individualmente** — cada uma deixa o site em estado válido em Production.

| PR | Foco | Precisa de OAuth real? | UI visível ao utilizador? | Estado |
|---|---|---|---|---|
| **V2 PR1** | DB + `lib/auth/` skeleton + ESLint rule | Não | Não | ✅ |
| **V2 PR2** | Login flow Google + callback + trigger profile sync + middleware refresh | **Sim** | Sim (botão "Entrar" no Header) | ✅ |
| **V2 PR3** | Roles UI (dropdown user + área `/admin` vazia + promoção super_admin) | Sim | Sim (dropdown só para autenticados) | ⏳ |
| **V2 PR4** | Etiquetas (DB + admin CRUD + atribuir a utilizadores) | Sim | Sim (só dentro de `/admin`) | ⏳ |

PRs 2-4 precisam que [google-oauth-setup.md](google-oauth-setup.md) esteja executado. PR1 pode arrancar sem.

---

## 1. V2 PR1 — Foundation

**Objectivo:** preparar a base de dados e o módulo de auth sem ainda permitir login. Deploy invisível em produção.

### Ficheiros criados/modificados

- `supabase/migrations/<timestamp>_profiles_and_current_profile_id.sql`:
  - `create table profiles` com colunas: `id uuid primary key default gen_random_uuid()`, `external_auth_id uuid unique not null references auth.users(id) on delete restrict`, `display_name text not null`, `role text not null default 'user' check (role in ('user','admin','super_admin'))`, `created_at timestamptz not null default now()`
  - `create or replace function current_profile_id() returns uuid language sql stable as ...`
  - **Sem** trigger DB ainda (vem em PR2 ou PR3 com o callback).
  - **Sem** RLS policies ainda (vem em PR4 quando houver tabelas de domínio para proteger; `profiles` em si tem RLS específica).
  - RLS em `profiles`:
    - `select` policy: `using (id = current_profile_id() or current_profile_id() in (select id from profiles where role = 'super_admin'))` → utilizador vê o próprio profile + super_admins vêem todos.
    - `update` policy: `using (id = current_profile_id())` com check (mas role só editável via Server Action gated por papel, PR3).
- `src/lib/auth/index.ts`:
  - Tipo `Profile` exportado (espelha colunas da DB)
  - `getCurrentUser(): Promise<Profile | null>` — primeira implementação devolve sempre `null` (placeholder); PR2 substitui pela versão real
  - `getServerClient()` — placeholder (não consultado em V1, fica pronto)
  - `signInWithGoogle()` — declarada mas atira `Error("Not implemented yet (V2 PR2)")` ao chamar
  - Esta camada já importa `@supabase/ssr`, mas as funções não fazem nada real ainda. Permite que outros módulos comecem a importar a partir daqui sem ter de mudar nada quando PR2 implementar.
- `eslint.config.js`:
  - Regra `no-restricted-imports` que proíbe `@supabase/ssr` (e equivalentes) fora de `src/lib/auth/**`. Aviso vira erro com `--max-warnings 0` no CI.
- `package.json`:
  - `@supabase/ssr` e `@supabase/supabase-js` instalados.
- Testes:
  - `src/lib/auth/index.test.ts` — testa que `getCurrentUser()` devolve `null` por defeito, que `signInWithGoogle()` atira erro com mensagem clara.
  - Migration testada manualmente contra `logos-dev` via `pnpm dlx supabase db push` (mesma estratégia da migration inicial).

### Verificações pós-merge

- `pnpm dlx supabase migration list` deve mostrar a nova migration aplicada em `logos-dev`.
- Painel Supabase → Table Editor → tabela `profiles` visível com 0 rows.
- Site em produção continua a funcionar como antes — nada mudou visualmente.

### Risco / cuidado

- **`external_auth_id` está com `on delete restrict`.** Se alguém apagar `auth.users` (admin Supabase), o delete falha porque há `profiles` a apontar. Isto é deliberado (preserva conclusões e histórico) — ver `auth-architecture.md` §9.

---

## 2. V2 PR2 — Login Flow ✅ (implementada 14-05-2026)

**Objectivo:** clicar "Entrar" → ida ao Google → volta com sessão → `profile` criado se for primeira vez.

### Pré-condições

- `feature-docs/google-oauth-setup.md` executado para `logos-dev`.
- `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` definidos.

### Ficheiros implementados

- `src/lib/auth/index.ts` — `getServerClient()` real (cria cliente `@supabase/ssr` com cookies); `getCurrentUser()` real (lookup `auth.uid() → profiles.external_auth_id → Profile camelCase`). Helper `getEnv()` valida vars Supabase. `signInWithGoogle()`/`signOut()` da PR1 movidas para `actions.ts` como Server Actions.
- `src/lib/auth/actions.ts` — `'use server'`. Server Actions `signInWithGoogleAction()` (chama `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: \`${origin}/auth/callback\` })` e redirecciona) + `signOutAction()`. Helper `getOrigin()` lê `origin`/`x-forwarded-proto`+`host` por ordem.
- `src/lib/auth/middleware.ts` + `src/middleware.ts` — refresca tokens Supabase em cada request. **Não estava na spec original**, mas é o setup canónico para `@supabase/ssr` em App Router (sem isto, sessões expiravam silenciosamente após 1h).
- `src/app/auth/callback/route.ts` — Route Handler GET:
  1. Recebe `?code=...` do Google.
  2. Chama `supabase.auth.exchangeCodeForSession(code)`.
  3. Redirecciona para `?next=<path>` (validado: só caminhos relativos internos, defesa anti-open-redirect) ou `/`.
  4. Erros viram `?auth_error=missing_code|exchange_failed`.
  5. **Não toca em `profiles`** — o trigger DB (abaixo) faz tudo. Ver "Decisão" abaixo.
- `src/components/site/sign-in-button.tsx` — `<form action={signInWithGoogleAction}>` com `Button` shadcn (`size="sm"`, label "Entrar"). Server component, sem `'use client'`.
- `src/components/site/header.tsx` — passa a `async`. Lê `getCurrentUser()`. Renderiza `<SignInButton />` quando `null`, ou `<span aria-live="polite">Olá, {primeiroNome}</span>` quando há sessão (dropdown real em PR3).
- `supabase/migrations/20260514015528_profiles_insert_trigger.sql` — função `handle_new_auth_user()` (`SECURITY DEFINER`, `coalesce(name, full_name, email)`) + trigger `on_auth_user_created AFTER INSERT ON auth.users`. Idempotente via `on conflict (external_auth_id) do nothing`.

### Decisão: trigger DB sozinho (vs spec original "Server Action + trigger")

A spec inicial em `auth-architecture.md` §5 propunha **dois caminhos** de criação de `profiles`: Server Action no callback (primário, lê metadata) + trigger DB (defensivo). A migration de PR1 deixou `profiles` sem `for insert` policy — Server Action a inserir exigiria service role (`SUPABASE_SERVICE_ROLE_KEY`).

**Implementámos só o trigger.** Razões:

1. Trigger `SECURITY DEFINER` cobre 100% dos caminhos: callback OAuth, criação por SQL admin, dashboard Supabase. Não há "buraco" para o callback tapar.
2. Trigger lê `raw_user_meta_data->>'name'` perfeitamente — a preocupação da spec original ("trigger DB tem mais dificuldade em ler") não se concretiza.
3. Evita introduzir um novo segredo (`SUPABASE_SERVICE_ROLE_KEY`) na app só para esta operação.

Trade-off: se a Supabase mudar a interface dos triggers de `auth.users`, o sync quebra silenciosamente. Mitigação: o teste E2E manual no fim do PR (ver abaixo) confirma fluxo end-to-end.

### Testes

- `src/lib/auth/index.test.ts` — 4 testes para `getCurrentUser()`: sem sessão; sessão sem profile; erro RLS; sucesso com mapeamento camelCase.
- `src/app/auth/callback/route.test.ts` — 6 testes: sucesso, `?next` válido, `?next` absoluto rejeitado, `?next` protocol-relative rejeitado, código em falta, exchange falhado.
- E2E manual em 14-05-2026: `pnpm dev` → clicar "Entrar" → round-trip Google → "Olá, {primeiroNome}" no Header.

### Checkpoint pós-PR2

- Correr `supabase/seed/super-admin.sql.example` contra `logos-dev` para promover `joaocanelasribeiro@gmail.com` a `super_admin`. Sem isto, PR3 não tem como testar o dropdown admin.
- Antes do primeiro merge V2 visível em prod: aplicar migrations PR1 + PR2 a `logos-prod` e definir `NEXT_PUBLIC_SUPABASE_*` no scope Production do Vercel.

---

## 3. V2 PR3 — Roles UI + área admin esqueleto

**Objectivo:** dropdown do utilizador no Header, área `/admin` acessível só a admin/super_admin, UI para super_admin promover outros.

### Ficheiros

- `src/components/site/user-menu.tsx` — dropdown (shadcn `DropdownMenu`) com nome do utilizador + items:
  - "Sessão de **{display_name}**"
  - Se `role !== 'user'`: link **"Área admin"** → `/admin`
  - "Terminar sessão" → Server Action que invoca `signOut()`
- `src/components/site/header.tsx` — substitui placeholder "Olá, {name}" pelo `<UserMenu />`.
- `src/app/admin/layout.tsx`:
  - Server component que chama `getCurrentUser()`. Se `role === 'user'`, devolve `notFound()` (renderiza o 404 PT-PT — coerente com "conteúdo restrito é invisível").
  - Renderiza um shell com `<aside>` de nav (Cursos, Utilizadores, Etiquetas — items que vão sendo implementados) + `<main>`.
- `src/app/admin/page.tsx` — landing simples ("Olá, admin").
- `src/app/admin/utilizadores/page.tsx` (só visível a super_admin):
  - Lista de profiles com o role actual
  - Botões "Promover a admin" / "Despromover a user" — Server Action gated por `role === 'super_admin'`
  - **Não** promove super_admins (apenas user ⇄ admin).
- RLS update: policy nova em `profiles` para `update role` só a super_admin.

### Testes

- `src/app/admin/utilizadores/page.test.tsx` — render com mock de `getCurrentUser()` super_admin vs admin vs user. Server Action chamada com user role → erro.
- E2E manual: login com super_admin → vê dropdown com "Área admin" → entra → promove outro user a admin → faz logout/login do outro → outro vê dropdown com "Área admin".

---

## 4. V2 PR4 — Etiquetas (fundação)

**Objectivo:** admins podem criar etiquetas e atribuí-las a utilizadores. Etiquetas existem mas ainda não restringem nada (V3 é que ata as etiquetas a cursos).

### Ficheiros

- `supabase/migrations/<timestamp>_tags.sql`:
  - `create table tags` (id uuid pk, slug text unique, name text, description text, created_at, created_by uuid references profiles(id))
  - `create table user_tags` (user_id uuid references profiles, tag_id uuid references tags, PK composta, granted_at, granted_by)
  - RLS policies — admin/super_admin podem CRUD; user pode ler as suas próprias `user_tags`.
- `src/app/admin/etiquetas/page.tsx` — lista de tags + form para criar nova.
- `src/app/admin/utilizadores/[id]/page.tsx` — detalhe do user + multi-select para atribuir/remover tags. Reutiliza componente existente da página de lista.

### Testes

- `src/app/admin/etiquetas/page.test.tsx` — gating por role, form validation.
- RLS testada com `pnpm dlx supabase test db` (a configurar — provavelmente outro PR pequeno antes).

---

## 5. Sequência operacional

```
PR1 (foundation) ────────────► merge
                                │
                                ▼
[Tu] Executar feature-docs/google-oauth-setup.md (Google Cloud + Supabase)
                                │
                                ▼
PR2 (login flow) ────────────► merge ──► Tu fazes primeiro login em logos-dev
                                                    │
                                                    ▼
                                       Tu corres supabase/seed/super-admin.sql contra logos-dev
                                                    │
                                                    ▼
PR3 (roles UI) ──────────────► merge ──► Tu promoves outros admins via UI (opcional)
                                │
                                ▼
PR4 (etiquetas) ─────────────► merge ──► V2 fica completo
                                │
                                ▼
[Tu] Antes da primeira merge V2 PR2 em prod:
  - Adicionar NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ao scope Production no Vercel (logos-prod). Estão deliberadamente unset hoje (V1 estático).
  - Correr seed super-admin contra logos-prod depois do primeiro login em prod.
```

## 6. Não-objectivos da V2

- Email + password (fora de âmbito V1-V9 por decisão em `SPEC_1.md` §17/§18).
- Cursos/módulos/aulas (V3).
- Etiquetas a restringir conteúdo (V3 para curso, V4 para módulo/aula).
- Q&A / dashboard de stats (V5).
- Notificações por email aos admins (V5).
- Dark mode / YouTube Live (V6).
- Sentry, Drizzle ORM, outras dependências (decisão adiada em `SPEC_1.md` §17).

## 7. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| OAuth App ficar "Testing" e bloquear utilizadores reais | Passo 4.11 do `google-oauth-setup.md` cobre "Publish app". App não pede verificação manual porque usa só scopes não-sensitive. |
| Cookies de sessão entre `localhost:3000` e `logos-git-*.vercel.app` não funcionam | Já temos os 3 hosts (localhost + preview wildcard + prod) listados em "Authorized JavaScript origins" e em "Redirect URLs" do Supabase. |
| Migration `profiles` aplicada em prod sem ainda existir login a popular rows | Sem problema — a tabela fica vazia até o primeiro login real em prod (após V2 PR2 estar em produção). |
| `display_name` vir nulo se o claim Google não trouxer `name` | Fallback no insert: `coalesce(name, email)`. Implementado tanto no Server Action como no trigger DB. |
| Super_admin a despromover-se a si próprio acidentalmente | UI **não permite** alterar o próprio `role` em PR3 (filtro no front + check na Server Action). |

## 8. Quando rever este plano

- Se a Supabase mudar API antes de V2 estar implementada (improvável a curto prazo).
- Se o ministério decidir abrir login a quem não tem Google account (reabre `SPEC_1.md` §17/§18).
- No fim da PR1, antes de começar a PR2 — fazer um check de "ainda faz sentido?".
