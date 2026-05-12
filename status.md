# status.md — Logos

> **Quando atualizar:** semanalmente, ou após uma sessão grande.
> **Última atualização:** 12-05-2026 (V1 PR1 — shell de navegação entregue)

## 🎯 Milestone atual
**V1 — Site público estático**. Setup terminou em 12-05-2026 com Vercel + branch protection. PR1 da V1 (shell de navegação) está em revisão.

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

## 🚧 Em progresso
- **V1 PR1 — Shell de navegação** (em revisão): `Header` global com hambúrguer mobile, `Footer` com identidade CCLX, `Home` com hero + CTAs, stubs para `/conhece-nos`, `/cursos`, `/fala-connosco`. Detalhes em `feature-docs/v1-shell.md`.

## ⏭️ Próximas tarefas (V1 → V2)
- [ ] **V1 PR2** — Conhece-nos (copy real em PT-PT) + Cursos placeholder mais elaborado
- [ ] **V1 PR3** — Fala connosco com info estática + `mailto:` (sem form em V1)
- [ ] **Verificação visual da V1** em browser real (Claude não tem browser; utilizador valida `pnpm dev` antes de cada merge)
- [ ] Identificar contacto de DNS na Hostinger (CNAME `logos.cclx.pt` → Vercel) — pendente para fechar `NEXT_PUBLIC_SITE_URL` em Production + `vercel domains add`
- [ ] Pedir versão limpa do SVG do logo ao ministério (sem fundo opaco); fallback de texto Cormorant + `BookOpen` está aceitável até lá
- [ ] Criar OAuth App no Google Cloud Console (uma para `logos-dev`, outra para `logos-prod`) e configurar como Provider em Supabase Auth — pré-condição V2
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
- **DNS Hostinger:** identificar contacto **antes** da semana de lançamento da V1
- **Plano gratuito Supabase:** sem backups; risco aceite até haver utilizadores reais
- **Branch protection em `main`:** activa desde 12-05-2026. Risco residual: admin (`enforce_admins: false`) pode fazer override em emergência — mitigado por disciplina honor-system de `CLAUDE.md` + `permissions.deny` no `.claude/settings.json`. Detalhes em `SPEC_1.md` §16 e `feature-docs/ci.md` §1.
- **Repo `cclx-pt/Logos` agora público:** decisão consciente para 0€/mês no Vercel Hobby (Pro custaria ~20€/mês/membro). Verificação de segurança feita antes da mudança (`feature-docs/vercel.md` §5). Trade-off: código visível; service role keys e qualquer credencial continuam apenas em `.env.local` (gitignored) e no painel do Vercel.
- **Exclusão de utilizadores sem Google account:** decisão consciente (`SPEC_1.md` §17/§18) para reduzir scope V2 e acelerar V3 (01-07-2026). Mitigação prevista: nenhuma — utilizadores afectados são redireccionados para criar uma Google account ou esperar versão futura. Reabrir apenas se o ministério explicitamente pedir inclusão.

## 📌 Decisões adiadas
Ver `SPEC_1.md` §17.
