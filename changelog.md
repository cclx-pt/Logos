# changelog.md — Logos

> **Quando atualizar:** após cada feature, fix ou mudança relevante.
> **Formato:** [data DD-MM-YYYY] — descrição curta no infinitivo, agrupada por tipo.
> **Tipos:** `add` (nova feature), `update` (melhoria), `fix` (correção), `docs` (documentação), `infra` (CI/CD, deploy, dependências).

---

## [Unreleased]

### infra
- add: repositório GitHub privado inicial
- add: estrutura de documentação (`CLAUDE.md`, `architecture.md`, `status.md`, `feature-docs/`)
- add: `.env.example` com placeholders Supabase + Resend
- add: `.gitignore` para Next.js + Supabase

---

## [12-05-2026] — V1 PR1: shell de navegação (Header + Footer + Home + stubs)

### add
- add: `src/components/site/header.tsx` — cabeçalho global sticky, `bg-background/95` com backdrop blur, logo à esquerda + nav à direita em desktop (`md+`), hambúrguer em mobile.
- add: `src/components/site/footer.tsx` — rodapé com Logo `size="sm"` + descrição do projeto, link à página da CCLX e copyright dinâmico.
- add: `src/components/site/logo.tsx` — wordmark "LOGOS" em Cormorant Garamond a `text-orange` + ícone `BookOpen` da `lucide-react`. Tamanhos `sm`/`md`/`lg`. Renderiza como `<Link href="/">` por defeito; `asStatic` para uso em hero/rodapé. Decisão de usar fallback de texto em vez do SVG de `docs/branding/logo-cclx-logos.svg` documentada em `feature-docs/v1-shell.md` §3.2 (SVG tem fundo `#F7F7F7` opaco que cobriria a paleta creme).
- add: `src/components/site/nav-links.tsx` — `'use client'`, lê `usePathname()` para aplicar `aria-current="page"` + sublinhado em rota activa. Reutilizado em desktop (`orientation="horizontal"`) e mobile (`orientation="vertical"`).
- add: `src/components/site/mobile-nav.tsx` — `'use client'`, hambúrguer + painel `fixed inset-x-0 top-16 bottom-0` com `role="dialog" aria-modal="true"`. Fecha com Escape, bloqueia scroll do body enquanto aberto. Sem dependência shadcn `Sheet` (não está na roadmap V1 do `feature-docs/shadcn-ui.md`).
- add: `src/lib/site-config.ts` — `siteConfig` (nome, descrição, organização) + `navItems` centralizados (single source of truth para nav).
- add: `src/app/conhece-nos/page.tsx`, `src/app/cursos/page.tsx`, `src/app/fala-connosco/page.tsx` — **stubs** com "em breve" para que o nav não dê 404 entre PRs. PR2 e PR3 substituem.
- add: `feature-docs/v1-shell.md` — estrutura, decisões (sem `Sheet`, logo textual, `Button render={<Link/>}` em vez de `asChild`), a11y, validação local.

### update
- update: `src/app/layout.tsx` — passa a envolver `children` em `<Header />` + `<main className="flex-1">` + `<Footer />`. Body com `bg-background text-foreground flex min-h-full flex-col`. Metadata `default` e `template` consomem `siteConfig`.
- update: `src/app/page.tsx` — "Em construção" reescrita como hero V1: Logo `size="lg" asStatic`, h1 "Estudo bíblico para uma fé enraizada.", parágrafo de intro PT-PT, dois CTAs (`Button render={<Link href="/cursos" />}` para "Ver cursos" + variant `ghost` para "Conhece o projeto").
- update: `src/app/page.test.tsx` — 3 testes: heading presente + wordmark visível + CTAs com `href` correctos. Removido o teste de "Em construção" (substituído por hero).

### why
- Primeira PR da V1; o site deixa de ser "Em construção" e passa a ter shell pronto para receber conteúdo nas PRs seguintes.
- Stubs em vez de rotas missing evitam 404 do nav durante revisão de PR2/PR3.
- Copy em PT-PT rascunhada pelo agent; revisão final pelo ministério antes de Production (decisão em chat — `status.md`).

### gotchas (documentados em `feature-docs/v1-shell.md`)
- Base UI (não Radix) — `Button` não tem `asChild`; usa `render` prop.
- SVG do logo de `docs/branding/` não é usável em runtime; fallback textual ao abrigo da `SPEC_1.md` §14.
- Tokens shadcn `--muted` (`#f4ead8`, background) vs `--muted-foreground` (`#6b6b6b`, texto): texto secundário usa `text-muted-foreground`.

---

## [12-05-2026] — Setup: branch protection em `main` activa

### infra
- add: regra de branch protection aplicada via `gh api PUT /repos/cclx-pt/Logos/branches/main/protection`. Configuração:
  - `required_pull_request_reviews: { required_approving_review_count: 0 }` — PR obrigatório, sem exigência de aprovação (single dev).
  - `required_status_checks: { strict: false, contexts: ["Lint · Typecheck · Test · Format"] }` — CI tem de passar antes de merge.
  - `required_linear_history: true` — alinhado com squash-merge usado em todos os PRs.
  - `allow_force_pushes: false`, `allow_deletions: false`.
  - `enforce_admins: false` — admin pode override em emergência; disciplina honor-system continua em `CLAUDE.md` + `.claude/settings.json` `permissions.deny`.

### docs
- update: `SPEC_1.md` §16 — branch protection passa de "elegível, activação pendente" para **activa** com a regra completa documentada.
- update: `SPEC_1.md` §19 — v2.6 → v2.7.
- update: `feature-docs/ci.md` §1 — admonition reescrita: regra activa, com a configuração concreta listada.
- update: `status.md` — bullet "Activar branch protection em `main`" movido para ✅ Concluído; entrada em ⚠️ Riscos actualizada (risco residual = override de admin).
- update: `changelog.md` — esta entrada.

### why
- Fecha o último item de fundação que dependia da mudança de visibilidade do repo (PR #15).
- Estabelece salvaguarda server-side para a regra "nunca push directo para `main`" que era apenas honor-system.
- Este próprio PR valida a regra na prática (primeiro a passar pelo gate).

---

## [12-05-2026] — Setup: Vercel bootstrap (deploy + env vars + repo público)

### infra
- add: projeto Vercel `logos` (`prj_V0Kp9TZj5QHdAkwBMoPenKlA1TJj`) no scope `jcrninjas-projects` (conta pessoal — CCLX sem Vercel team, adiar até Pro justificável). Framework auto-detectado Next.js. Install/build resolvidos via `packageManager: pnpm@10.33.2` do `package.json`.
- add: Vercel GitHub App instalado em `cclx-pt` org com acesso restrito a `Logos` (Only select repositories). `push origin main` → Production deploy; PRs → Preview com URL único; webhook GitHub → Vercel.
- add: env vars nos 3 scopes (Production / Preview / Development) via `vercel env add`:
  - **Production**: `NEXT_PUBLIC_SITE_NAME=Logos` (Supabase prod env vars deliberadamente unset até checkpoint V2).
  - **Preview**: `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_SUPABASE_URL` (logos-dev), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (logos-dev). Preview aponta para `logos-dev`, não `logos-prod` (segurança de mutação, schema testing, auth testing, custo zero).
  - **Development**: mesmo conjunto do Preview + `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Espelha `.env.local` para `vercel env pull` quando alguém clonar o repo.
- update: visibilidade do repo `cclx-pt/Logos` privada → pública (12-05-2026). Restrição do plano Hobby: repo de organização privado requer Pro (~20€/mês). Mudança aceite após verificação de segurança (nenhum `.env` jamais commitado; refs Supabase são identificadores públicos por design; publishable key é client-side; service role nunca em ficheiro versionado).

### add
- add: `.gitignore` — entrada `.vercel` (ficheiros gerados por `vercel link`: `.vercel/project.json` contém `projectId` + `orgId`, não deve ser versionado).
- add: `feature-docs/vercel.md` — bootstrap completo: recursos provisionados, ligação GitHub↔Vercel, env vars por scope (com decisão Preview→logos-dev), razão da mudança de visibilidade do repo (com checklist de segurança), CLI install/login, gotcha do `vercel env add` em Claude Code (auto-deteção de agent + workaround `env -u CLAUDECODE`), validação do primeiro deploy, DNS pendente, troubleshooting.

### docs
- update: `SPEC_1.md` §13.5 — Preview deploys formalizados a apontar para `logos-dev` (decisão prévia em `feature-docs/supabase.md` PR #12 promovida à SPEC).
- update: `SPEC_1.md` §16 e `feature-docs/ci.md` §1 — branch protection passa de "não elegível no plano free" para "elegível agora que o repo é público"; activação fica como tarefa nova.
- update: `architecture.md` §8 — tabela de ambientes inclui Vercel scopes (Production/Preview/Development) e referência a `feature-docs/vercel.md`.
- update: `status.md` — bullet "Criar conta Vercel e ligar ao repositório" movido para ✅ Concluído; tarefa nova "Activar branch protection em `main`" em ⏭️ (agora elegível); risco antigo sobre branch protection actualizado.

### why
- Pré-condição V1 (site público estático precisa de host com deploy automático).
- Preview deploys por PR aceleram review (URL único, comentário automático no PR, valida build antes de merge).
- 0€/mês mantido como `SPEC_1.md §11` exige; trade-off da visibilidade do repo aceite após auditoria.

---

## [09-05-2026] — Setup: auth scope reduzido para Google OAuth apenas (V1-V9)

### docs
- update: `SPEC_1.md` §9.2 (V2) — login passa a Google OAuth apenas; remoção da linha de recovery emails via Resend.
- update: `SPEC_1.md` §11 — célula Autenticação atualizada (apenas Google OAuth, com referência a §17/§18); célula Email (Resend) passa para "V5+ notificações Q&A" (sem urgência V2).
- update: `SPEC_1.md` §17 — nova decisão adiada explícita sobre email/password como método alternativo (reabrir apenas se o ministério pedir inclusão de utilizadores sem Google).
- update: `SPEC_1.md` §18 — login com email e palavra-passe listado como fora de âmbito V1-V9.
- update: `SPEC_1.md` §19 — versão 2.4 → 2.5.
- update: `CLAUDE.md` 🏗️ Arquitetura — descrição auth ajustada (Google OAuth apenas).
- update: `architecture.md` cabeçalho — data atualizada para 09-05-2026.
- update: `architecture.md` §4 — primeira linha reescrita; nota sobre shell futura potencialmente oferecer email/password sem condicionar a decisão V2.
- update: `architecture.md` §11 (RGPD) — origens de email e display_name actualizadas para "Google OAuth (claim)".
- update: `feature-docs/auth-architecture.md` §3.1 — `signInWithGoogle()` listado como única função de sign-in da API pública.
- update: `feature-docs/auth-architecture.md` §5 — sincronização clarificada como callback OAuth do Google.
- update: `feature-docs/auth-architecture.md` §7 — tabela de email/display_name actualizada para refletir claim do Google.
- update: `feature-docs/auth-architecture.md` §10 — fluxos de email/password listados como fora deste documento.
- update: `feature-docs/supabase.md` §7 — secção Auth simplificada (só Google).
- update: `status.md` — Resend movido para tarefa adiada V5+; tarefa Google Cloud OAuth acrescentada como pré-condição V2; nova entrada em ⚠️ Riscos sobre exclusão de utilizadores sem Google.

### why
- Esforço V2 auth desce de ~13h para ~3.5h.
- Elimina duas dependências externas em V2 (Resend account + DNS Hostinger SPF/DKIM).
- Acelera entrega da V3 (prazo: 01-07-2026).
- Trade-off aceite: utilizadores sem Google ficam fora até decisão contrária.

---

## [09-05-2026] — Setup: pipeline Supabase migrations validado em logos-dev

### infra
- run: `pnpm dlx supabase link --project-ref dknrnqyqlojvnhspwjrd` — autenticação CLI via PAT (`SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` apenas nas env vars da sessão Bash; nada commitado).
- run: `pnpm dlx supabase db push` — primeira migration `20260509175745_initial.sql` aplicada à DB remota de `logos-dev`. Confirmado via MCP `list_migrations`: `[{"version":"20260509175745","name":"initial"}]`. Pipeline end-to-end (gerar → linkar → push) validado antes de existir schema real (V2).

### docs
- update: `status.md` — bullets "Configurar `.env.local`" e "Linkar Supabase CLI a `logos-dev` + primeira `db push`" movidos para ✅ Concluído. "Última atualização" estendida.

---

## [09-05-2026] — Setup: Supabase bootstrap (2 projetos + CLI + primeira migration)

### infra
- add: projeto Supabase `logos-dev` (ref `dknrnqyqlojvnhspwjrd`) em `eu-west-3` (Paris). Free tier ($0/mês). Provisionado via MCP `mcp__plugin_supabase_supabase__create_project`. Status `ACTIVE_HEALTHY`.
- add: projeto Supabase `logos-prod` (ref `tirzriuabfwzqxtjsmfb`) em `eu-west-3` (Paris). Free tier ($0/mês). `ACTIVE_HEALTHY`.

### add
- add: `supabase/config.toml` — gerado por `pnpm dlx supabase init`. Define `project_id = "Logos"`, ports locais (API 54321, DB 54322), schemas `public` + `graphql_public`. Sem instalação global da CLI; `pnpm dlx` é a forma canónica.
- add: `supabase/migrations/20260509175745_initial.sql` — primeira migration placeholder com comentários. Schema real chega na V2 (profiles, tags, user_tags, função `current_profile_id()`) e V3 (courses, modules, lessons, conclusões).

### docs
- add: `feature-docs/supabase.md` — bootstrap dos 2 projetos, env vars (com troca de `anon` legacy para `publishable_key`), CLI workflow (link + db push), strategy de migrations dev → prod, gotchas do plano free (sem backups, sem Docker local), referências.
- update: `.env.example` — `NEXT_PUBLIC_SUPABASE_ANON_KEY` → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato moderno `sb_publishable_*` recomendado pela Supabase). `SUPABASE_SERVICE_ROLE_KEY` mantido (legacy enquanto Supabase não migra a UI). Comentário com refs dos 2 projetos para referência rápida.
- update: `status.md` — bullets "Criar projetos Supabase" e "Configurar Supabase CLI + primeira migration vazia" movidos para ✅ Concluído. Acrescentadas duas tarefas em ⏭️ (configurar `.env.local` e linkar CLI a `logos-dev`).

---

## [09-05-2026] — Setup: shadcn/ui instalado e mapeado à paleta CCLX

### add
- add: scaffold `pnpm dlx shadcn@latest init -d`. CLI v4 detetou Next.js 16 + Tailwind v4 + alias `@/*` automaticamente. Criou `components.json`, `src/lib/utils.ts` (`cn()` helper), e `src/components/ui/button.tsx` (incluído no scaffold em CLI v4).
- add: deps em `dependencies` — `@base-ui/react ^1.4.1` (primitive library default em CLI v4; substitui Radix), `class-variance-authority ^0.7.1`, `clsx ^2.1.1`, `lucide-react ^1.14.0`, `shadcn ^4.7.0` (package que disponibiliza `@import "shadcn/tailwind.css"`), `tailwind-merge ^3.5.0`, `tw-animate-css ^1.4.0`.

### update
- update: `components.json` — `baseColor: neutral` → `stone` (mais quente; alinha com tom creme da paleta).
- update: `src/app/globals.css` — paleta CCLX preservada em `@theme` (fonte de verdade); tokens semânticos shadcn (`--background`, `--primary`, `--foreground`, `--muted`, `--accent`, `--border`, `--ring`, etc.) mapeados em `:root` para os hex CCLX; `@theme inline` mapeia tokens Tailwind v4 (`--color-*`) para as CSS vars; `--font-heading: var(--font-display)` para que componentes shadcn que usem font-heading apliquem Cormorant. Bloco `.dark` mantém defaults shadcn (placeholder até V6).
- update: `src/app/layout.tsx` — restaurado para versão original Cormorant + Inter; removida tentativa do CLI v4 de injectar Geist como `--font-sans` (gotcha conhecido).
- update: `feature-docs/branding.md` §1 e §2 — secções obsoletas reescritas para Tailwind v4 (sem `tailwind.config.ts`). §1 mostra agora `@theme` em `globals.css` para tokens CCLX + `:root`/`@theme inline` para tokens semânticos shadcn. §2 troca `tailwind.config.ts → extend.fontFamily` por `@theme` em CSS. §7 historial estendido.

### docs
- add: `feature-docs/shadcn-ui.md` — comando, configuração final, mapeamento token-a-token CCLX → shadcn, decisões (style `base-nova`, `baseColor: stone`, Base UI vs Radix, lucide), 4 gotchas (layout corrompido, font-sans circular, prettier reformat após `add`, format:check local em Windows), roadmap por versão (V1: card/input/textarea/label/form; V2: dropdown-menu/avatar/dialog/alert/separator/badge; V3: accordion/skeleton/scroll-area; **sem progress até V7**).

---

## [08-05-2026] — Setup: branch protection adiada (plano free) → regra honor-system

### docs
- update: `SPEC_1.md` §16 — restrição nova: branch protection do GitHub não está ativa (plano gratuito não a disponibiliza em repositórios privados; decisão consciente de não subscrever Pro). Regra "PR obrigatório, nunca push directo para `main`" fica honor-system em `CLAUDE.md`, reforçada por `git push --force`, `git reset --hard` e `git branch -D *main*` em `.claude/settings.json` `permissions.deny`.
- update: `SPEC_1.md` §19 — versão 2.3 → 2.4.
- update: `feature-docs/ci.md` — nota sobre branch protection reescrita: passa de "ainda não está ativa" (com expectativa de ativar a seguir) para "não vai ser ativada com o plano atual"; explica trade-off e ligação a `SPEC_1.md` §16.
- update: `status.md` — bullet "Ativar branch protection em `main`" removido de ⏭️ Próximas tarefas; nova entrada em ⚠️ Riscos / bloqueios; "Última atualização" estendida.

---

## [08-05-2026] — Setup: GitHub Actions CI (lint + typecheck + test + format:check)

### infra
- add: `.github/workflows/ci.yml` — job único `quality` em `pull_request` e `push` para `main`. Steps sequenciais: checkout → `pnpm/action-setup@v4` (versão lida do `packageManager`) → `actions/setup-node@v4` com `cache: pnpm` → `pnpm install --frozen-lockfile` → `pnpm exec eslint --max-warnings 0` → `pnpm typecheck` → `pnpm test` → `pnpm format:check`. `concurrency` com `cancel-in-progress: true` (poupa minutos em pushes consecutivos). `permissions: contents: read` (princípio do menor privilégio). `timeout-minutes: 10` (rede de segurança contra flakes). Tempo típico de execução: ~30s.
- add: `.gitattributes` — normaliza line endings (`* text=auto eol=lf`) com listas explícitas para binários e SVGs. Resolve avisos `LF will be replaced by CRLF` em Windows e impede drift entre dev local (Windows) e CI (Linux).

### docs
- add: `feature-docs/ci.md` — pipeline canónica documentada (triggers, concurrency, decisão de job único, passo a passo dos steps, secção de troubleshooting, roadmap V2 com coverage thresholds e V3 com Playwright contra preview deploys).
- update: `architecture.md` §10 — passos da pipeline atualizados (5 passos em vez de 4 + E2E V3) e remete para `feature-docs/ci.md`.
- update: `eslint.config.mjs` — `globalIgnores` inclui `coverage/**`.

---

## [08-05-2026] — Setup: fronteira de identidade vs autorização Logos

### docs
- add: `feature-docs/auth-architecture.md` — desenho da fronteira: camada `src/lib/auth/` como única importadora de `@supabase/ssr`; tabela `profiles` com `id` (FK universal Logos) e `external_auth_id` (única ligação ao sistema de identidade externo); sincronização `auth.users → profiles` em defesa em profundidade (Server Action + trigger DB); RLS via função SQL `current_profile_id()`; `display_name` no Logos vs email não duplicado; lista do que muda e do que **não** muda quando uma shell partilhada CCLX vier substituir a identidade. Implementação fica para V2.
- update: `SPEC_1.md` §17 — entrada sobre "SSO com app da CCLX" reescrita: passa de "não viável agora" para "não implementada agora, mas estruturada para ser substituível"; remete para `architecture.md` §4 e `feature-docs/auth-architecture.md`.
- update: `SPEC_1.md` §19 — versão 2.2 → 2.3.
- update: `architecture.md` §2 — FKs `auth.users` migradas para `profiles` em `tags.created_by`, `user_tags.user_id`, `user_tags.assigned_by`, `lesson_completions.user_id`, `course_completions.user_id`, `course_access_log.user_id`; schema de `profiles` reescrito (`id` PK, `external_auth_id` UNIQUE, `display_name`, `role`, `created_at`); nota explicativa da fronteira de identidade.
- update: `architecture.md` §3 — camada de identidade (`src/lib/auth/`) listada com responsabilidade explícita; `getVisibleCoursesForUser` passa a aceitar `profileId`.
- update: `architecture.md` §4 — reescrita: identidade isolada em `lib/auth/`; RLS via `current_profile_id()` em vez de JWT custom claim direto; sincronização `auth.users → profiles` em defesa em profundidade documentada; ligação a `feature-docs/auth-architecture.md`.
- update: `CLAUDE.md` — três regras duras novas em "🚫 Regras (não negociáveis)": (1) identidade isolada em `src/lib/auth/`; (2) FKs nunca para `auth.users`, sempre para `profiles.id`; (3) email não duplicado em tabelas Logos.
- update: `status.md` — bullet em ✅ Concluído sobre fronteira de identidade documentada; data atualizada.

---

## [05-05-2026] — Setup: Vitest + Testing Library + primeiro smoke test

### add
- add: **Vitest 4.1.5** + **`@vitest/coverage-v8` 4.1.5** — runner com env `jsdom`, `globals: true`, alias `@/*` via Vite 7 nativo (`resolve.tsconfigPaths: true`)
- add: **`@testing-library/react` 16.3.2** + **`@testing-library/jest-dom` 6.9.1** + **`@testing-library/user-event` 14.6.1** — primeira major a suportar React 19
- add: **`@vitejs/plugin-react` 6.0.1** + **`jsdom` 29.1.1**
- add: `vitest.config.ts` — env jsdom, globals, setup file, exclude `node_modules`/`.next`/`e2e`, coverage V8 (text + html), exclui `layout.tsx`/`fonts.ts` (sem ROI sem mock de `next/font`)
- add: `src/test/setup.ts` — `import '@testing-library/jest-dom/vitest'` + `cleanup()` automático em `afterEach`
- add: `src/app/page.test.tsx` — primeiro smoke test (2 asserções: heading `aria-label="Logos"` com texto "LOGOS"; legenda "Em construção" presente). 2/2 a passar
- add: scripts `test`, `test:watch`, `test:coverage` em `package.json`
- add: `vitest/globals` + `@testing-library/jest-dom` em `tsconfig.json` `compilerOptions.types`
- add: `feature-docs/testing.md` — estratégia de testes (stack, decisões, padrões para regras duras de CLAUDE.md, anti-padrões, troubleshooting)

### update
- update: `status.md` — Vitest item movido para ✅; data atualizada
- update: `package.json` — bump deps + scripts (sem `vite-tsconfig-paths`, removido após aviso do Vitest 4 sobre suporte nativo)

---

## [05-05-2026] — Setup: Next.js 16 + Tailwind v4 + TS strict + ESLint 9 + Prettier (pnpm)

### add
- add: Next.js **16.2.4** com App Router, `src/`, alias `@/*`, Turbopack default — scaffold via `pnpm create next-app@latest --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-pnpm --turbopack`
- add: TypeScript 5.9 em `strict: true` (config `tsconfig.json` default do scaffold)
- add: Tailwind **v4** (`tailwindcss@^4`, `@tailwindcss/postcss@^4`) com tokens de branding em `@theme` no `src/app/globals.css` (paleta de 8 cores + famílias `--font-sans` Inter / `--font-display` Cormorant Garamond)
- add: ESLint **9** flat config (`eslint.config.mjs`) com `eslint-config-next/core-web-vitals` + `eslint-config-next/typescript`
- add: Prettier 3.8 com `prettier-plugin-tailwindcss` (ordem canónica de classes) e `eslint-config-prettier/flat` (desliga regras conflituosas no ESLint)
- add: `.prettierrc.json` (single quote, semi true, trailingComma all, printWidth 100, LF) e `.prettierignore` (build, lockfile, `.claude/`, docs versionados manualmente)
- add: `src/app/fonts.ts` — Cormorant Garamond (500/600) + Inter (400/500/600) via `next/font/google` com subset `latin`
- add: `src/app/layout.tsx` — `<html lang="pt-PT">`, fontes injetadas, metadata com template `'%s · Logos'`
- add: `src/app/page.tsx` — wordmark "LOGOS" (Cormorant + `text-orange`) + "Em construção" sobre `bg-cream-bg`, `aria-label` no h1 para screen readers
- add: scripts `lint:fix`, `typecheck`, `format`, `format:check` em `package.json`
- add: `engines` (`node >=20`, `pnpm >=10`) e `packageManager: pnpm@10.33.2` em `package.json`
- add: `feature-docs/nextjs-init.md` — documentação exaustiva (comando exato, flags, decisões, troubleshooting)

### update
- update: `CLAUDE.md` — Framework de "Next.js 15" para "Next.js 16"
- update: `architecture.md` — diagrama e cabeçalho passam a Next.js 16; data de última atualização
- update: `SPEC_1.md` §11 — célula Framework atualizada para Next.js 16 (justificação ajustada)
- update: `feature-docs/branding.md` — secção "Carregamento (Next.js X App Router)" passa a 16
- update: `.claude/agents/test-runner.md` — mensagem de erro refere Next.js 16
- update: `status.md` — Next.js init movido para ✅; remoção do bullet "Inicializar projeto Next.js 15..." da lista de próximas tarefas

### housekeeping
- remove: SVGs boilerplate em `public/` (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`)
- add: `AGENTS.md` no root — aviso do Next 16 sobre breaking changes vs versões anteriores

---

## [05-05-2026] — Branding: SVG oficial do logótipo

### add
- add: `docs/branding/logo-cclx-logos.svg` — SVG oficial entregue pelo ministério (1600×913, 452 paths, wordmark "LOGOS" + livro aberto estilizado a linha laranja)

### docs
- update: `feature-docs/branding.md` — secção §3 Logótipo flipada de pendente → recebido; fallback de texto reclassificado como `aria-label`; histórico de 05-05-2026 estendido
- update: `status.md` — SVG do logótipo movido de 🚧 para ✅; risco "logótipo bloqueia V1" removido

### infra
- update: `.gitignore` — ignorar `.claude/worktrees/` (estado interno do Claude Code) e `claude-code-psb-guide.md` (notas pessoais soltas)

---

## [05-05-2026] — Setup: configuração transversal do Claude Code

### infra
- add: `.claude/settings.json` versionado — 7 plugins ativos (`github`, `vercel`, `supabase`, `typescript-lsp`, `commit-commands`, `frontend-design`, `engineering-skills`), marketplace `claude-code-skills` declarado, modelo `opus`
- add: permissões partilhadas `permissions.allow` para pnpm, supabase CLI, vercel CLI, git, gh, shadcn — reduz prompts em qualquer máquina
- add: permissões `permissions.deny` para operações destrutivas (`rm -rf`, `git push --force`, `git reset --hard`, `git branch -D *main*`, `supabase projects delete`, `vercel remove`, `gh repo delete`)

### docs
- add: `feature-docs/claude-code-setup.md` — guia para configurar Claude Code numa máquina nova (clone → `claude` → instalar plugins → autenticar serviços), explicação das camadas de configuração, lista de plugins, política de permissões

---

## [05-05-2026] — Setup: identidade visual fixada (paleta + tipografia)

### docs
- update: `SPEC_1.md` §14 — paleta hex fixada com 8 tokens (`cream-bg`, `cream-card`, `sage-card`, `butter-card`, `orange-primary`, `orange-hover`, `ink`, `muted`); tipografia fixada (Cormorant Garamond + Inter via `next/font/google`); descrição de logótipo com fallback de texto até chegar SVG; mockups vinculativos referenciados
- update: `SPEC_1.md` §17 — decisão "paleta + tipografia" resolvida; pendente apenas SVG do logótipo
- update: `SPEC_1.md` §19 — versão 2.1 → 2.2
- add: `feature-docs/branding.md` — spec completa de tokens (mapeamento Tailwind + shadcn HSL), regras de uso, escala tipográfica, integração Next.js 15, regras do logótipo, mockups vinculativos
- update: `status.md` — paleta + tipografia movidas para ✅; SVG do logo é o único item em 🚧; risco de "logótipo bloqueia V1" removido (fallback em texto)
- add: `docs/branding/placeholder-cclx-logos.png` — *placeholder* atual em `cclx.cclx.pt/logos` como referência de tom
- add: `docs/branding/mockups-v3.jpeg` — quatro mockups V3 (catálogo, aula, módulo, apostila) — referência vinculativa de paleta e estrutura

---

## [04-05-2026] — Setup: agents e slash commands para Claude Code

### infra
- add: sub-agent `doc-updater` (`.claude/agents/doc-updater.md`) — sincroniza `changelog.md`, `status.md`, `architecture.md` e `feature-docs/`
- add: sub-agent `pt-pt-reviewer` (`.claude/agents/pt-pt-reviewer.md`) — audita strings user-facing em busca de PT-BR e inglês
- add: sub-agent `test-runner` (`.claude/agents/test-runner.md`) — corre `pnpm lint && pnpm typecheck && pnpm test` (+ `test:e2e` a partir da V3)
- add: sub-agent `spec-guardian` (`.claude/agents/spec-guardian.md`) — valida âmbito de versão e regras duras antes de implementar
- add: slash command `/update-docs` — invoca `doc-updater` com slug opcional
- add: slash command `/version-check` — invoca `spec-guardian` com descrição da tarefa
- add: slash command `/pr-ready` — checklist pré-PR (branch ≠ main, testes, PT-PT, docs)

---

## [02-05-2026] — Auditoria de docs pré-Setup

### docs
- update: `SPEC_1.md` §11 — adicionar Vitest, Playwright (V3+), ESLint, Prettier, TypeScript `strict`, Supabase CLI; clarificar 2 projetos Supabase (`logos-dev`/`logos-prod`)
- update: `SPEC_1.md` §13 — fluxo de dev formalizado (PR + GitHub Actions + branch protection + passos de migration)
- update: `SPEC_1.md` §17 — remover decisão "Supabase único vs separados" (resolvida = 2 projetos)
- update: `SPEC_1.md` §19 — versão 2.0 → 2.1
- add: `architecture.md` §10 — secção CI/CD (GitHub Actions + Vercel)
- add: `architecture.md` §11 — secção Privacidade e RGPD
- update: `architecture.md` §5 — nota sobre estado "rascunho" via etiqueta WIP (sem coluna nova)
- update: `architecture.md` §8 — tabela de ambientes inclui projeto Supabase + DNS para Resend + procedimento de migrations
- update: `architecture.md` §9 — remover decisão Supabase env (resolvida)
- update: `status.md` — concluído + tarefas de Setup expandidas (testes, CI, SPF/DKIM, 2 projetos Supabase)

---

## [28-04-2026] — Setup inicial

### docs
- add: `SPEC_1.md` v2.0 (especificação canónica)
- add: `CLAUDE.md` com objetivos, arquitetura, estilo e regras
- add: `architecture.md` com modelo de dados V3/V4
- add: `status.md` para milestones
- add: `feature-docs/` para documentação por feature
