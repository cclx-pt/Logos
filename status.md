# status.md — Logos

> **Quando atualizar:** semanalmente, ou após uma sessão grande.
> **Última atualização:** 19-05-2026 (V2.5 em hold no preview; V3 arrancou em `v3-cursos`; V3 PR1 Etiquetas concluído localmente; 73/73 testes verdes)

## 🎯 Milestone atual
**V3 em desenvolvimento local em `v3-cursos`, V2.5 em hold no preview.** Decisão estratégica (19-05-2026): V2.5 fica em preview até o ministério mandar testemunhos finais + títulos dos cards de `/conteudos`; quando isso chegar, V2.5 é mergeada em `main` e fica live em `logos.cclx.pt`. V3 é desenvolvida só em branch `v3-cursos` + Vercel previews, **nunca toca `main` em parciais** — sobe ao Production num único merge no dia do lançamento (prazo 01-07-2026). Plano completo em `feature-docs/v3-plan.md` (9 PRs). V2 PR4 (Etiquetas) absorvida em V3 PR1.

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
- [x] **V2 PR2 — Login flow** (14-05-2026) — `getCurrentUser()`/`getServerClient()`/`getRouteHandlerClient(response)` reais em `src/lib/auth/index.ts`; Server Actions `signInWithGoogleAction`/`signOutAction` em `src/lib/auth/actions.ts`; route handler `src/app/auth/callback/route.ts` faz `exchangeCodeForSession` + redirect (com validação anti-open-redirect em `?next`); proxy raiz `src/proxy.ts` (convenção Next.js 16, ex-`middleware.ts`) refresca tokens via `src/lib/auth/proxy.ts`; `<SignInButton />` no Header (substitui "Olá, {nome}" quando autenticado); 3 migrations aplicadas a `logos-dev`: `20260514015528` (trigger `on_auth_user_created` em `auth.users` que popula `profiles` via `SECURITY DEFINER`), `20260514022124` (`current_profile_id()` passa a `SECURITY DEFINER` para quebrar recursão RLS), `20260514022734` (policy SELECT em `profiles` reescrita para usar `current_profile_role()` em vez de `or exists (select ... from profiles)` — segunda recursão eliminada). E2E manual confirmou login Google → "Olá, João" no Header. Bonus: `home-hero.tsx` migrou de `<Button render={<Link/>}>` para `<Link className={buttonVariants(...)}>` para eliminar warning Base UI persistente. 24/24 testes a passar.
- [x] **V2 PR3 — Roles UI** (14-05-2026, local) — `UserMenu` em `src/components/site/user-menu.tsx` (dropdown shadcn/base-ui no Header: label "Sessão de X", link "Área admin" só se role !== 'user', "Terminar sessão"); área `/admin` (`layout.tsx` com gating `notFound()` para user/sem sessão + nav aside; `page.tsx` landing; `utilizadores/page.tsx` lista de profiles para super_admin com botões Promover/Despromover via form inline `'use server'`); Server Action `setUserRoleAction` em `utilizadores/actions.ts` com defesas (caller=super_admin, alvo≠caller, alvo≠super_admin, newRole∈{user,admin}). Migration `20260514030344_profiles_role_mutation_authority` aplicada a `logos-dev`: policy `profiles_update_super_admin` (permite super_admin update de outros) + trigger BEFORE UPDATE `enforce_profiles_role_mutation_authority` (defesa em profundidade contra mutações inválidas de role, incluindo service-role-bypass). `shadcn dropdown-menu` instalado. 39/39 testes (15 novos: 2 UserMenu + 4 layout + 9 action). Mergeado em `main` na PR #27.
- [x] **V3 PR1 — Etiquetas (fundação)** (19-05-2026, local em `v3-cursos`, NÃO mergeado) — Migration `20260518120000_tags_and_user_tags.sql` aplicada a `logos-dev`: tabelas `tags` (slug unique CHECK 2-64 kebab-case, label 1-80, created_by → profiles restrict) e `user_tags` (PK composta, assigned_by, cascade em user_id/tag_id), helper SQL `current_profile_has_tag(uuid[])` STABLE + SECURITY DEFINER (será usado em V3 PR2 para `courses` RLS), RLS escrita restrita a super_admin em `tags` e admin+super_admin em `user_tags`. UI: `/admin/etiquetas` super_admin-only com create/edit (`?editar=<id>`)/delete (`?apagar=<id>`) totalmente server-side, sem Client Components novos. `/admin/utilizadores` relaxa para admin+super_admin com coluna nova de pills + select nativo para atribuir/remover etiquetas; promote/demote permanece super_admin only. Server Actions: `createTagAction`/`updateTagAction`/`deleteTagAction` em `etiquetas/actions.ts`; `assignTagAction`/`unassignTagAction` em `utilizadores/actions.ts` (upsert idempotente `ignoreDuplicates`). 21 testes novos (52 → 73 verdes). V2 PR4 absorvida.

## 🚧 Em progresso
- **V3 PR2 — Schema base + storage** (próxima PR de V3). Detalhes em `feature-docs/v3-plan.md` §2: migrations `courses`/`modules`/`lessons`/`lesson_completions`/`course_completions`/`course_access_log` + bucket privado `lesson-pdfs` + policies de Storage. Sem UI (PR ship-able sozinha; ship-able = passa CI, não significa "sobe a prod" — V3 fica em `v3-cursos` até 01-07-2026).

## ⏭️ V2.x — Copy + UX (implementado localmente, 16-05-2026)
- [x] **PR-A** — Copy & branding global: LOGOS maiúsculo, capitalizações (Bíblico, Fé, Enraizada, Connosco), em dashes fora, aspas `"..."` em vez de `«»`, lema do ministério em itálico (3 linhas em `home-motto.tsx`), parágrafos longos justificados.
- [x] **PR-B** — Home hero: logo maior (`size="xl"`), botão "Conhece o projeto" removido, CTA laranja centrado "Meus cursos" (autenticado → /conteudos; sem sessão → `signInWithGoogleAction` com hidden `next`).
- [x] **PR-C** — `/conteudos` (nova rota) + placeholder com texto final do ministério + 3 cards "Em preparação"; `/cursos` passa a `permanentRedirect('/conteudos')` (308).
- [x] **PR-D** — Carrossel de 5 testemunhos placeholder no home via `embla-carousel-react`; setas + dots acessíveis; loop infinito.
- [x] **PR-E** — Fala Connosco com texto novo do ministério ("Queres falar Connosco..."), sem horários nem morada.
- [x] **PR-F** — Dropdown user: `Os meus cursos` / `Perfil` / `Área admin` (condicional) / `Terminar sessão`. `/perfil` placeholder com avatar Google, nome, email (de `auth.users`), papel, data de criação.

### Próximos passos para fechar V2.5
- [x] **Branch `v2.5-copy-ux` push para preview** (18-05-2026) — não merge em `main` enquanto carrossel for placeholder. Preview Vercel atrás de Vercel Authentication (login na conta do João).
- [x] **Fix 404 Base UI** (18-05-2026) — `not-found-content.tsx` passa de `<Button render={<Link/>}>` para `<Link className={buttonVariants(...)}>`.
- [ ] E2E completo no preview a partir de outro dispositivo (login no Vercel com a conta `joaocanelasribeiro@gmail.com`): hero (autenticado e não autenticado) → carrossel → /conteudos → /perfil → dropdown completo. Confirmar redirect 308 de /cursos.
- [ ] Pedir ao ministério os 4–5 testemunhos finais para substituir os placeholders.
- [ ] Pedir ao ministério títulos provisórios para os cards de cursos em `/conteudos`.
- [ ] Quando testemunhos chegarem: substituir, abrir PR de `v2.5-copy-ux` → `main`, merge, apagar branch.

## ⏭️ Próximas tarefas (V3)
- [x] **Aplicar migrations V2 a `logos-prod`** (14-05-2026) — 5 migrations em ar via `pnpm dlx supabase db push --include-all`.
- [x] **Bootstrap super_admin** (14-05-2026) — `joaocanelasribeiro@gmail.com` em ambos `logos-dev` e `logos-prod`.
- [x] **V3 PR1 — Etiquetas** (19-05-2026) — aplicada a `logos-dev`. **Não** aplicada a `logos-prod`: V3 só sobe a prod no merge final.
- [ ] **V3 PR2 — Schema courses/modules/lessons + Storage `lesson-pdfs`**. Detalhes em `feature-docs/v3-plan.md` §2.
- [ ] **V3 PR3 — Admin CRUD de Cursos** (com `required_tags` multi-select). `feature-docs/v3-plan.md` §3.
- [ ] **V3 PR4 — Admin CRUD de Módulos + Aulas** (PDF upload + YouTube URL). §4.
- [ ] **V3 PR5 — Catálogo público em `/conteudos`**. §5.
- [ ] **V3 PR6 — Página de curso + página de aula**. §6.
- [ ] **V3 PR7 — Conclusão binária + ecrã Curso Concluído**. §7.
- [ ] *(polish, prazo permite)* **V3 PR8 — Access log + admin stats**. §8.
- [ ] *(polish, prazo permite)* **V3 PR9 — Vercel Analytics + Playwright E2E**. §9.
- [ ] Substituir copy placeholder de Conhece-nos por texto final do ministério. *Bloqueado por: ministério.*
- [ ] Acrescentar morada + horários da igreja a Fala connosco. *Bloqueado por: ministério.*

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
