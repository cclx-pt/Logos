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
