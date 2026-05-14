# status.md — Logos

> **Quando atualizar:** semanalmente, ou após uma sessão grande.
> **Última atualização:** 14-05-2026 (V2 PR1 implementada: migration profiles + skeleton lib/auth/ + ESLint guard)

## 🎯 Milestone atual
**V1 — Site público estático em ar.** Conteúdo placeholder substituível, a11y, stagger, logo com interiores transparentes. **V2 — Auth + Roles + Etiquetas** começa a seguir, em 4 PRs sequenciais (`feature-docs/v2-auth.md`). PR1 (foundation: migration `profiles` + skeleton `lib/auth/` + ESLint rule) não precisa de OAuth real e pode arrancar de imediato. PR2 em diante depende de executar `feature-docs/google-oauth-setup.md`.

**Prazo absoluto V3:** 1 de julho de 2026.

## ✅ Concluído
- [x] Especificação `SPEC_1.md` v2.2 fechada
- [x] Repositório GitHub privado criado
- [x] Estrutura de docs (`CLAUDE.md`, `architecture.md`, `changelog.md`, `status.md`, `feature-docs/`)
- [x] `.env.example` e `.gitignore` versionados
- [x] Auditoria de docs pré-Setup (decisões: Next.js 15, Vitest+Playwright, 2 projetos Supabase, secções CI/CD e Privacidade)
- [x] Configurar slash commands e sub-agents para Claude Code (`doc-updater`, `pt-pt-reviewer`, `test-runner`, `spec-guardian` + `/update-docs`, `/version-check`, `/pr-ready`)
- [x] **Paleta hex fixada** (`cream-bg`, `cream-card`, `sage-card`, `butter-card`, `orange-primary`, `orange-hover`, `ink`, `muted`) — `feature-docs/branding.md`
- [x] **Tipografia fixada**: Cormorant Garamond (display) + Inter (UI), via `next/font/google`
- [x] Mockups V3 versionados como referência vinculativa em `docs/branding/`
- [x] **SVG oficial do logótipo** recebido e versionado em `docs/branding/logo-cclx-logos.svg`
- [x] **Next.js 16** inicializado (App Router, src/, alias `@/*`) com TypeScript strict, Tailwind v4, ESLint 9 flat config, Prettier + `eslint-config-prettier` + `prettier-plugin-tailwindcss`, pnpm. Tokens de branding aplicados em `src/app/globals.css` via `@theme`. Smoke test: home `lang="pt-PT"` com wordmark "LOGOS" + "Em construção". Detalhes em `feature-docs/nextjs-init.md`.
- [x] **Vitest 4 + Testing Library 16 + jsdom** configurados (env jsdom, globals, alias `@/*` via Vite 7 nativo). Setup em `src/test/setup.ts` (matchers de `jest-dom` + `cleanup` automático). Coverage V8. Primeiro smoke test em `src/app/page.test.tsx` (2/2 a passar). Detalhes em `feature-docs/testing.md`.
- [x] **GitHub Actions CI** configurado (`.github/workflows/ci.yml`) — job único `quality` em PR e push para `main`: lint estrito (`--max-warnings 0`) + typecheck + Vitest + format:check. `concurrency` com `cancel-in-progress`, `permissions: contents: read`, cache pnpm via `packageManager`, timeout 10 min. `.gitattributes` normaliza line endings em LF (resolve drift CRLF entre Windows e CI). Detalhes em `feature-docs/ci.md`.
- [x] **Supabase** — 2 projetos provisionados via MCP em `eu-west-3` (Paris): `logos-dev` (ref `dknrnqyqlojvnhspwjrd`) e `logos-prod` (ref `tirzriuabfwzqxtjsmfb`), ambos `ACTIVE_HEALTHY` em plano free ($0/mês). CLI inicializada com `pnpm dlx supabase init` (sem instalar global) — criado `supabase/config.toml`. Primeira migration `supabase/migrations/20260509175745_initial.sql` é placeholder vazio (apenas comentários) para validar pipeline end-to-end antes de existir schema real (V2). `.env.example` atualizado para `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (formato `sb_publishable_*` recomendado, substitui `anon` legacy). Detalhes do workflow em `feature-docs/supabase.md`.
- [x] **`.env.local` configurado** com credenciais de `logos-dev` (URL + publishable key). `SUPABASE_SERVICE_ROLE_KEY` e `RESEND_API_KEY` ficam comentadas até ao primeiro uso (V2 admin / Resend setup). `.env.local` está em `.gitignore` (não versionado).
- [x] **Pipeline Supabase migrations validado end-to-end** em `logos-dev` — `pnpm dlx supabase link --project-ref dknrnqyqlojvnhspwjrd` + `pnpm dlx supabase db push` aplicaram `20260509175745_initial.sql` à DB remota. Confirmado via MCP `list_migrations`: `[{"version":"20260509175745","name":"initial"}]`. CLI fica autenticada localmente em `supabase/.temp/` (pasta no `.gitignore`).
- [x] **shadcn/ui** instalado (`pnpm dlx shadcn@latest init -d`) com `style: base-nova`, `baseColor: stone`, `iconLibrary: lucide`. Tokens semânticos shadcn (`--background`, `--primary`, etc.) mapeados em `src/app/globals.css` para os hex CCLX (paleta de `feature-docs/branding.md` §1 continua fonte de verdade). `Button` instalado como smoke (não usado em produção até V1). `feature-docs/branding.md` §1-§2 reescritas para Tailwind v4 (sem `tailwind.config.ts`). Detalhes e gotchas em `feature-docs/shadcn-ui.md`.
- [x] **Fronteira de identidade vs autorização** documentada — *identidade* (Supabase Auth, migra para shell um dia) separada de *autorização Logos* (papéis, etiquetas, conclusões; fica sempre cá). Camada `src/lib/auth/` planeada como única importadora de `@supabase/ssr`; FKs migram de `auth.users` para `profiles.id`; `profiles.external_auth_id` é o único ponto de mudança quando a shell existir; RLS via função helper `current_profile_id()`. SPEC_1.md §17 reescrita; `architecture.md` §2-§4 atualizadas; CLAUDE.md ganhou três regras duras (isolamento de importações, FK universal, email não duplicado). Detalhes em `feature-docs/auth-architecture.md`. Implementação fica para V2.
- [x] **Vercel bootstrap** — projeto `logos` (`prj_V0Kp9TZj5QHdAkwBMoPenKlA1TJj`) no scope pessoal `jcrninjas-projects` (CCLX sem Vercel team, adiar até Pro justificável). Vercel GitHub App instalado em `cclx-pt` com acesso restrito a `Logos`: push em `main` → Production; PRs → Preview com URL único. Env vars nos 3 scopes via `vercel env add` (gotcha do `CLAUDECODE=1` documentado em `feature-docs/vercel.md` §7). **Preview aponta para `logos-dev`**, não `logos-prod` (segurança de mutação + schema testing + auth testing; SPEC_1.md §13.5 e architecture.md §8 atualizadas). Repo `cclx-pt/Logos` passou de privado a **público** em 12-05-2026 para caber no plano Hobby do Vercel (verificação de segurança: nenhum `.env` foi alguma vez commitado; refs Supabase são públicas por design; publishable key é client-side; service role nunca em ficheiro versionado). Bónus: branch protection torna-se elegível. `.gitignore` ganhou `.vercel`. Detalhes em `feature-docs/vercel.md`.
- [x] **Branch protection em `main` activa** (12-05-2026) — aplicada via `gh api PUT /repos/cclx-pt/Logos/branches/main/protection`. Regra: PR obrigatório, check `Lint · Typecheck · Test · Format` verde antes de merge, histórico linear, force-push/deletion bloqueados, admin override possível em emergência, 0 reviews exigidos (single dev faz self-merge). Validação: este próprio PR (#16) é o primeiro a passar pela regra. Detalhes em `SPEC_1.md` §16 e `feature-docs/ci.md` §1.
- [x] **V1 PR1 — Shell de navegação mergeado** (PR #17, 12-05-2026): `Header` global com hambúrguer mobile, `Footer` com identidade CCLX, `Home` com hero + CTAs, stubs para `/conhece-nos`, `/cursos`, `/fala-connosco`. CI verde, squash-merge, branch apagada. Detalhes em `feature-docs/v1-shell.md`.
- [x] **Domínio `logos.cclx.pt` activo em Production** (12-05-2026) — CNAME único Vercel (`00f4337193415fe7.vercel-dns-017.com`) configurado no painel Hostinger; A/AAAA antigos do sub-domínio `logos` removidos para libertar o nome. Certificado HTTPS auto-emitido. `NEXT_PUBLIC_SITE_URL=https://logos.cclx.pt` adicionado ao scope Production e redeploy forçado (inlined em build-time). Detalhes em `feature-docs/vercel.md` §9 e changelog `[12-05-2026]`.
- [x] **V1 polimento — 404 PT-PT + robots/sitemap + limpeza** (13-05-2026) — `src/app/not-found.tsx` em PT-PT dentro do shell (CTAs Home + Cursos); `src/app/robots.ts` permissivo com `sitemap`/`host` para `siteConfig.url`; `src/app/sitemap.ts` derivado de `navItems`; `/debug-logo` removida (scaffolding fechado em V1 PR1). 2 testes novos para o 404 (5/5 a passar). PR #19 mergeada. Detalhes em `changelog.md` `[13-05-2026]`.
- [x] **Decisões pré-V2 registadas** (13-05-2026) — `SPEC_1.md` §4 + `architecture.md` §4 + `feature-docs/auth-architecture.md` §5.1: primeiro super_admin é `joaocanelasribeiro@gmail.com`; entrada à área `/admin` via item no dropdown do utilizador (apenas visível se `role !== 'user'`); seed via SQL versionado idempotente em `supabase/seed/super-admin.sql.example`. SPEC bump v2.8. PR #20 mergeada.
- [x] **V1 a11y — skip-link** (13-05-2026) — `src/components/site/skip-link.tsx` como primeiro elemento focável do body (`sr-only` → visível no `:focus`); `<main id="main-content">` é alvo do salto. WCAG 2.4.1. PR #21 mergeada.
- [x] **V1 UX — stagger nas 4 páginas + interiores das letras do logo** (13-05-2026) — variants partilhados em `src/lib/motion-variants.ts`; `conhece-nos`, `cursos`, `fala-connosco` e `not-found` ganham entrada animada coerente com o hero (`page.tsx` server + `<name>-content.tsx` client). `public/logo-cclx-interiors.svg` gerado a partir de `logo-cclx-clean.svg` via análise de bboxes: 247 paths creme dentro do contorno das letras ficam `fill="none"`, livro e gaps mantidos. PR #22 mergeada.
- [x] **V1 conteúdo placeholder** (14-05-2026) — Conhece-nos com 3 secções (identificação CCLX + "O que aqui encontras" + "Quem está por trás" + tag "Em construção"); Cursos com intro + grid de 3 cards "O que vais encontrar" (vídeo + PDF + ritmo próprio); Fala connosco com 2 cards (mailto `logos@cclx.pt` com subject prefilled + link CCLX `target="_blank" rel="noopener noreferrer"`) + nota inferior sobre horários pendentes. 6 testes novos (14/14 a passar). PR #23 mergeada.
- [x] **Logo SVG resolvido** (14-05-2026) — decisão: ficamos com `public/logo-cclx-interiors.svg` (gerado por análise de bboxes, interiores das letras transparentes) em vez de esperar versão limpa do ministério. Funciona bem em Production, livro mantém detalhe.
- [x] **V2 planeada** (14-05-2026) — `feature-docs/google-oauth-setup.md` com passo-a-passo Google Cloud Console + Supabase Auth provider para `logos-dev` e `logos-prod`; `feature-docs/v2-auth.md` com sequência de 4 PRs (foundation → login → roles UI → etiquetas), ficheiros tocados, testes pensados, riscos. PR1 não precisa de OAuth funcional. PR #24 mergeada.
- [x] **V2 PR1 — Foundation** (14-05-2026) — migration `profiles` + função `current_profile_id()` + RLS em profiles (select próprio/super_admin, update próprio); skeleton `src/lib/auth/index.ts` com tipo `Profile`/`Role` + 4 stubs (getCurrentUser/getServerClient/signInWithGoogle/signOut); ESLint `no-restricted-imports` bloqueia `@supabase/ssr` e `@supabase/supabase-js` fora de `src/lib/auth/**`. Deps instaladas: `@supabase/ssr@0.10.3` + `@supabase/supabase-js@2.105.4`. 18/18 testes a passar.

## 🚧 Em progresso
- (sem trabalho em progresso)

## ⏭️ Próximas tarefas (V1 → V2)
- [ ] Substituir copy placeholder de Conhece-nos e Fala connosco por texto final do ministério (sem alteração de estrutura).
- [ ] Acrescentar morada + horários da igreja a Fala connosco quando o ministério os fornecer.
- [ ] **Aplicar migration V2 PR1 a `logos-dev`** — `pnpm dlx supabase db push` (ou via MCP/painel) com `supabase/migrations/20260514002002_profiles_and_current_profile_id.sql`. Validar via `list_migrations` que aparece aplicada. Repetir em `logos-prod` apenas antes da primeira merge V2 PR2 em prod.
- [ ] **Executar `feature-docs/google-oauth-setup.md`** (20 min no browser) — pré-condição para V2 PR2.
- [ ] **V2 PR2 — Login flow** (precisa de OAuth do passo anterior). Detalhes em `feature-docs/v2-auth.md` §2.
- [ ] **V2 PR3 — Roles UI**. Detalhes em `feature-docs/v2-auth.md` §3.
- [ ] **V2 PR4 — Etiquetas (fundação)**. Detalhes em `feature-docs/v2-auth.md` §4.
- [ ] **Após V2 PR1 (migration `profiles`):** primeiro login Google em `logos-dev` por `joaocanelasribeiro@gmail.com` → correr `supabase/seed/super-admin.sql.example` (cópia local) contra `logos-dev`. Repetir em `logos-prod` no final da V2. Processo documentado em `feature-docs/auth-architecture.md` §5.1.
- [ ] **Checkpoint V2 — antes do primeiro merge V2:** adicionar `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ao scope Production do Vercel (logos-prod). Hoje estão deliberadamente unset porque V1 é estático.
- [ ] *(adiado para V5+)* Resend + SPF/DKIM no DNS Hostinger — sem urgência V2 por o login ser apenas Google; necessário para notificações de Q&A em V5

## 🗺️ Roadmap por versão (resumo)

| Versão | Foco | Estado |
|---|---|---|
| **Setup** | Tooling, Supabase, Vercel, branding | 🚧 Em curso |
| **V1** | Site público estático (home, conhece-nos, fala connosco) | ⏳ |
| **V2** | Auth (Google OAuth apenas), papéis, fundação de etiquetas | ⏳ |
| **V3** | Cursos/Módulos/Aulas + restrição por curso + conclusão binária | ⏳ **Prazo: 01-07-2026** |
| **V4** | Etiquetas multi-nível (módulo + aula) | ⏳ |
| **V5** | Q&A por aula + dashboard de stats | ⏳ |
| **V6** | YouTube Live + dark mode | ⏳ |
| **V7+** | Indicadores de progresso (a reavaliar) | 🤔 |

## ⚠️ Riscos / bloqueios
- **Plano gratuito Supabase:** sem backups; risco aceite até haver utilizadores reais
- **Branch protection em `main`:** activa desde 12-05-2026. Risco residual: admin (`enforce_admins: false`) pode fazer override em emergência — mitigado por disciplina honor-system de `CLAUDE.md` + `permissions.deny` no `.claude/settings.json`. Detalhes em `SPEC_1.md` §16 e `feature-docs/ci.md` §1.
- **Repo `cclx-pt/Logos` agora público:** decisão consciente para 0€/mês no Vercel Hobby (Pro custaria ~20€/mês/membro). Verificação de segurança feita antes da mudança (`feature-docs/vercel.md` §5). Trade-off: código visível; service role keys e qualquer credencial continuam apenas em `.env.local` (gitignored) e no painel do Vercel.
- **Exclusão de utilizadores sem Google account:** decisão consciente (`SPEC_1.md` §17/§18) para reduzir scope V2 e acelerar V3 (01-07-2026). Mitigação prevista: nenhuma — utilizadores afectados são redireccionados para criar uma Google account ou esperar versão futura. Reabrir apenas se o ministério explicitamente pedir inclusão.

## 📌 Decisões adiadas
Ver `SPEC_1.md` §17.
