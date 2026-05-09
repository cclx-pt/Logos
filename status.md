# status.md — Logos

> **Quando atualizar:** semanalmente, ou após uma sessão grande.
> **Última atualização:** 09-05-2026 (Supabase: 2 projetos provisionados + CLI + primeira migration)

## 🎯 Milestone atual
**Fase de Setup** — preparar fundações antes de iniciar a V1.

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
- [x] **shadcn/ui** instalado (`pnpm dlx shadcn@latest init -d`) com `style: base-nova`, `baseColor: stone`, `iconLibrary: lucide`. Tokens semânticos shadcn (`--background`, `--primary`, etc.) mapeados em `src/app/globals.css` para os hex CCLX (paleta de `feature-docs/branding.md` §1 continua fonte de verdade). `Button` instalado como smoke (não usado em produção até V1). `feature-docs/branding.md` §1-§2 reescritas para Tailwind v4 (sem `tailwind.config.ts`). Detalhes e gotchas em `feature-docs/shadcn-ui.md`.
- [x] **Fronteira de identidade vs autorização** documentada — *identidade* (Supabase Auth, migra para shell um dia) separada de *autorização Logos* (papéis, etiquetas, conclusões; fica sempre cá). Camada `src/lib/auth/` planeada como única importadora de `@supabase/ssr`; FKs migram de `auth.users` para `profiles.id`; `profiles.external_auth_id` é o único ponto de mudança quando a shell existir; RLS via função helper `current_profile_id()`. SPEC_1.md §17 reescrita; `architecture.md` §2-§4 atualizadas; CLAUDE.md ganhou três regras duras (isolamento de importações, FK universal, email não duplicado). Detalhes em `feature-docs/auth-architecture.md`. Implementação fica para V2.

## 🚧 Em progresso
_Nada bloqueado de momento. A avançar para Setup → V1._

## ⏭️ Próximas tarefas (Setup → V1)
- [ ] Configurar `.env.local` com credenciais de `logos-dev` (manual; ver `feature-docs/supabase.md` §3)
- [ ] Linkar Supabase CLI a `logos-dev` (`pnpm dlx supabase link --project-ref dknrnqyqlojvnhspwjrd`) e correr primeira `db push` para validar pipeline
- [ ] Criar API key Resend + adicionar SPF/DKIM ao DNS Hostinger
- [ ] Criar conta Vercel e ligar ao repositório (env vars separadas por ambiente)
- [ ] Identificar contacto de DNS na Hostinger (CNAME logos.cclx.pt + SPF/DKIM Resend = mesma dependência)

## 🗺️ Roadmap por versão (resumo)

| Versão | Foco | Estado |
|---|---|---|
| **Setup** | Tooling, Supabase, Vercel, branding | 🚧 Em curso |
| **V1** | Site público estático (home, conhece-nos, fala connosco) | ⏳ |
| **V2** | Auth (email + Google), papéis, fundação de etiquetas | ⏳ |
| **V3** | Cursos/Módulos/Aulas + restrição por curso + conclusão binária | ⏳ **Prazo: 01-07-2026** |
| **V4** | Etiquetas multi-nível (módulo + aula) | ⏳ |
| **V5** | Q&A por aula + dashboard de stats | ⏳ |
| **V6** | YouTube Live + dark mode | ⏳ |
| **V7+** | Indicadores de progresso (a reavaliar) | 🤔 |

## ⚠️ Riscos / bloqueios
- **DNS Hostinger:** identificar contacto **antes** da semana de lançamento da V1
- **Plano gratuito Supabase:** sem backups; risco aceite até haver utilizadores reais
- **Branch protection inactiva em `main`:** plano gratuito do GitHub não a disponibiliza em repositórios privados. Decisão consciente de não subscrever Pro. Regra "PR obrigatório, nunca push directo" mantém-se honor-system em `CLAUDE.md` + `permissions.deny` no `.claude/settings.json`. Detalhes em `SPEC_1.md` §16 e `feature-docs/ci.md`.

## 📌 Decisões adiadas
Ver `SPEC_1.md` §17.
