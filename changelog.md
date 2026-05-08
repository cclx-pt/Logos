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
