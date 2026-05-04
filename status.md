# status.md — Logos

> **Quando atualizar:** semanalmente, ou após uma sessão grande.
> **Última atualização:** 05-05-2026

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

## 🚧 Em progresso
- [ ] Receber **SVG** do logótipo final do ministério (V1 pode arrancar com wordmark em texto como fallback)

## ⏭️ Próximas tarefas (Setup → V1)
- [ ] Inicializar projeto Next.js 15 + TS (`strict`) + Tailwind + ESLint + Prettier + pnpm
- [ ] Adicionar Vitest + `@testing-library/react` + primeiro teste smoke
- [ ] Configurar GitHub Actions (`ci.yml`: lint + typecheck + test em PR)
- [ ] Ativar branch protection em `main`
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
- **SVG do logótipo:** em falta; V1 arranca com wordmark em texto Cormorant + `orange-primary` como fallback (substituível drop-in quando chegar)
- **Plano gratuito Supabase:** sem backups; risco aceite até haver utilizadores reais

## 📌 Decisões adiadas
Ver `SPEC_1.md` §17.
