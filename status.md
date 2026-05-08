# status.md — Logos

> **Quando atualizar:** semanalmente, ou após uma sessão grande.
> **Última atualização:** 08-05-2026 (CI configurado + fronteira de identidade vs autorização documentada)

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
- [x] **Fronteira de identidade vs autorização** documentada — *identidade* (Supabase Auth, migra para shell um dia) separada de *autorização Logos* (papéis, etiquetas, conclusões; fica sempre cá). Camada `src/lib/auth/` planeada como única importadora de `@supabase/ssr`; FKs migram de `auth.users` para `profiles.id`; `profiles.external_auth_id` é o único ponto de mudança quando a shell existir; RLS via função helper `current_profile_id()`. SPEC_1.md §17 reescrita; `architecture.md` §2-§4 atualizadas; CLAUDE.md ganhou três regras duras (isolamento de importações, FK universal, email não duplicado). Detalhes em `feature-docs/auth-architecture.md`. Implementação fica para V2.

## 🚧 Em progresso
_Nada bloqueado de momento. A avançar para Setup → V1._

## ⏭️ Próximas tarefas (Setup → V1)
- [ ] Ativar branch protection em `main` (exigir check `Lint · Typecheck · Test · Format` antes de merge)
- [ ] Instalar e configurar shadcn/ui
- [ ] Criar projetos Supabase: `logos-dev` e `logos-prod`
- [ ] Configurar Supabase CLI + primeira migration vazia
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

## 📌 Decisões adiadas
Ver `SPEC_1.md` §17.
