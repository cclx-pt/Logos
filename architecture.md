# architecture.md — Logos

> **Quando atualizar:** após mudanças estruturais (novo serviço, alteração de modelo de dados, nova fronteira de segurança, mudança de stack).
> **Última atualização:** 12-05-2026 (Vercel bootstrap + Preview→logos-dev formalizado)

## 1. Visão de alto nível

```
┌────────────────────────┐
│   Browser (PT-PT)      │
│   logos.cclx.pt        │
└──────────┬─────────────┘
           │ HTTPS
           ▼
┌──────────────────────────────────────┐
│            VERCEL                    │
│  Next.js 16 (App Router) + TS        │
│  ├── /app          (rotas públicas)  │
│  ├── /app/admin    (CRUD de admin)   │
│  ├── /app/api      (route handlers)  │
│  └── Server Actions (mutações)       │
└──────────┬───────────────────────────┘
           │ Supabase JS client (anon + service)
           ▼
┌──────────────────────────────────────┐
│            SUPABASE                  │
│  • Postgres (esquema relacional)     │
│  • Auth (Google OAuth apenas)        │
│  • Storage (bucket: lesson-pdfs)     │
│  • RLS policies                      │
└──────────────────────────────────────┘

Externos: YouTube (iframes) · Resend (emails) · GitHub (CI/CD) · Hostinger DNS (CNAME)
```

## 2. Modelo de dados (V3 → V4)

```
courses
 ├─ id (uuid, PK)
 ├─ slug (unique)
 ├─ title, description, icon
 ├─ required_tags[] (V3: aplicado aqui)
 ├─ created_at, updated_at, published_at
modules
 ├─ id (uuid, PK)
 ├─ course_id (FK → courses)
 ├─ position (int)
 ├─ title, description
 ├─ required_tags[] (V4)
lessons
 ├─ id (uuid, PK)
 ├─ module_id (FK → modules)
 ├─ position (int)
 ├─ title, description
 ├─ template ('pdf' | 'video_pdf' | …)
 ├─ youtube_url (nullable)
 ├─ pdf_storage_path (nullable)
 ├─ required_tags[] (V4)
tags
 ├─ id (uuid, PK)
 ├─ slug (unique), label
 ├─ created_by (FK → profiles)
user_tags
 ├─ user_id (FK → profiles)
 ├─ tag_id (FK → tags)
 ├─ assigned_by (FK → profiles), assigned_at
 ├─ PK (user_id, tag_id)
lesson_completions
 ├─ user_id (FK → profiles), lesson_id (FK → lessons)
 ├─ PK (user_id, lesson_id)
 ├─ completed_at
course_completions
 ├─ user_id (FK → profiles), course_id (FK → courses)
 ├─ PK (user_id, course_id)
 ├─ completed_at (primeira vez; preservado)
course_access_log  -- contabilização leve V3
 ├─ user_id (FK → profiles), course_id (FK → courses), accessed_at
profiles  -- fonte de verdade do Logos para o utilizador
 ├─ id (uuid, PK)                 -- ID interno estável; FK universal para tudo o que é Logos
 ├─ external_auth_id (uuid, UNIQUE) -- aponta para o sistema de identidade externo
 ├─ display_name (text)
 ├─ role ('user'|'admin'|'super_admin')
 ├─ created_at (timestamptz)
```

**IDs estáveis:** todos os IDs são UUIDs gerados pela DB. Renomear/reordenar nunca afeta `lesson_completions`.

**Fronteira de identidade (regra dura):** `profiles.external_auth_id` é o único campo do Logos que aponta para o sistema de identidade externo. Hoje aponta para `auth.users.id` (Supabase Auth). No futuro pode apontar para o ID que uma shell partilhada CCLX vier a entregar — quando essa shell existir, **muda-se apenas este campo (e a função `current_profile_id()`); nenhuma outra tabela é afetada**. Nada mais no Logos referencia `auth.users` diretamente: todas as FKs apontam para `profiles.id`. Detalhes em `feature-docs/auth-architecture.md`.

## 3. Camadas e responsabilidades

| Camada | Responsabilidade |
|---|---|
| **Camada de identidade (`src/lib/auth/`)** | Única importadora de `@supabase/ssr` em toda a app. Expõe duas APIs públicas: `getCurrentUser()` (devolve o `profile` ativo) e `getServerClient()` (cliente Supabase autenticado). Todo o acesso a sessão e cliente passa por aqui. |
| **Server Components** | Fetch de dados públicos (catálogo, detalhe de curso) com cache do Next |
| **Server Actions** | Mutações: `markLessonComplete`, CRUD admin, gestão de etiquetas |
| **Route Handlers `/api`** | Webhooks (Resend, futuros), endpoints assinados |
| **RLS no Postgres** | Última linha de defesa: utilizador só lê o que pode ver |
| **Lógica de visibilidade** | Função única `getVisibleCoursesForUser(profileId)` reutilizada em catálogo, detalhe e cálculo de conclusão |

## 4. Autenticação e papéis

- **Supabase Auth** com **Google OAuth apenas** — gere identidade (login via Google, sessão, OAuth callback). Email/password é decisão fechada como fora de âmbito V1-V9 (`SPEC_1.md` §17/§18).
- **Identidade isolada em `src/lib/auth/`** (V2): única parte da app que importa `@supabase/ssr`. Resto da app consome `getCurrentUser()` / `getServerClient()`. Quando a identidade migrar para uma shell externa, só esta camada muda.
- Papel guardado em `profiles.role` — fonte de verdade do Logos. RLS usa função helper `current_profile_id()` (STABLE em SQL) que faz o lookup `auth.uid() → profiles.external_auth_id → profiles.id`. As policies escrevem-se contra `current_profile_id()`, não contra `auth.uid()`. Quando a identidade vier de outra fonte, troca-se a implementação da função; as policies não mudam.
- **Super Admin** é seed manual no primeiro ambiente; promove/despromove via UI dedicada (V2). Esta UI **não desaparece** quando a shell existir — papéis continuam fonte de verdade do Logos.
- Sessão via cookies httpOnly geridos pela camada `lib/auth/` (não diretamente em middleware do Next.js).
- **Sincronização `auth.users → profiles`** (V2): defesa em profundidade — Server Action no callback de auth faz `insert ... on conflict do nothing` (controlado, testável); trigger DB defensivo apanha qualquer caminho que escape (ex.: criação por SQL admin).

Esta separação entre **identidade** (quem és — pode migrar) e **autorização Logos** (o que podes fazer aqui — fica sempre cá) é a fronteira que torna possível migrar futuramente para identidade externa (ex.: shell partilhada CCLX) sem reescrever a app. Detalhes em `feature-docs/auth-architecture.md`.

Se a shell partilhada CCLX vier a oferecer email/password ou outros providers no futuro, beneficia-se automaticamente — a camada `lib/auth/` continua a ser substituída de uma vez, sem condicionar a decisão de scope V2 que limita o Logos a Google OAuth.

## 5. Visibilidade por etiquetas

**Regra única (V3 e V4):**
> Um item é visível se: `required_tags` está vazio **OU** o utilizador tem ≥ 1 etiqueta em `required_tags`.

- V3: avaliada apenas em `courses.required_tags`
- V4: avaliada recursivamente em `courses → modules → lessons`
- Itens-pai vazios desaparecem do catálogo

**Estado "rascunho":** V3 não tem flag de publicação separada em `modules`/`lessons` (apenas `courses.published_at`). Quando o admin precisa de construir conteúdo sem o expor, anexa ao curso uma etiqueta WIP (ex.: `rascunho`) e atribui-a apenas a si próprio. Remove a etiqueta quando o curso fica pronto. Reutiliza o sistema de etiquetas; sem coluna nova.

## 6. Estado de conclusão

- `lesson_completions` é a fonte primária
- `course_completions.completed_at` é gravado na **primeira** vez que todas as aulas visíveis estão concluídas; preservado para sempre
- Recalculado *on-read* quando o utilizador entra na página do curso (não há cron job)

## 7. Storage de PDFs

- Bucket `lesson-pdfs` (privado)
- URLs **assinados** com TTL curto (ex. 5 min) gerados em Server Action quando o utilizador clica em "Descarregar"
- A política RLS do bucket reflete a visibilidade da aula

## 8. Deploy e ambientes

| Ambiente | Branch | Frontend | Supabase | Notas |
|---|---|---|---|---|
| Produção | `main` | `logos.cclx.pt` (Vercel scope Production) | `logos-prod` | `NEXT_PUBLIC_SUPABASE_*` deliberadamente unset até checkpoint V2 |
| Preview | feature branches | `logos-<hash>-jcrninjas-projects.vercel.app` (Vercel scope Preview) | **`logos-dev`** | Aponta para `logos-dev` — PRs testam migrations + mutações sem poluir prod |
| Local | — | `localhost:3000` | `logos-dev` | `.env.local` (gitignored); espelhado em Vercel scope Development para `vercel env pull` |

Detalhes do bootstrap Vercel (env vars por scope, mudança de visibilidade do repo, gotcha do CLI em Claude Code) em `feature-docs/vercel.md`.

**DNS (Hostinger):**
- CNAME `logos.cclx.pt → cname.vercel-dns.com` (pendente — depende de contacto Hostinger)
- TXT (SPF) e CNAME (DKIM) para Resend — adiado para V5+ (login agora é só Google OAuth; Resend não é dependência V2)

**Migrations:**
- `supabase/migrations/*.sql` no Git (Supabase CLI)
- `supabase db push --project-ref <ref>` aplicado primeiro a `logos-dev`, depois a `logos-prod` após PR merged
- Sem auto-apply em prod — passo manual e deliberado

## 9. Decisões adiadas

- Drizzle ORM vs cliente Supabase puro → manter cliente até houver dor real
- Sentry → adiar para V2+
- Backup pago do Supabase → reavaliar com utilizadores reais

Ver também: `SPEC_1.md` §17.

---

## 10. CI/CD

### GitHub
- Branch único de produção: `main`. Push directo bloqueado por **branch protection**.
- Pull requests obrigatórios; self-merge é aceitável (developer único) **mas só com checks verdes**.
- PRs e pushes em `main` despoletam o Vercel automaticamente.

### GitHub Actions (`.github/workflows/ci.yml`)
Em cada PR e push para `main`:
1. `pnpm install --frozen-lockfile`
2. `pnpm exec eslint --max-warnings 0` (lint estrito; falha em warnings)
3. `pnpm typecheck` (`tsc --noEmit`)
4. `pnpm test` (Vitest)
5. `pnpm format:check` (Prettier — proteção anti-drift)
6. *(a partir da V3)* `pnpm test:e2e` (Playwright contra preview deploy)

Detalhes em `feature-docs/ci.md`.

### Vercel
- **Preview deploy** por branch (URL único partilhável).
- **Production deploy** apenas em `main`.
- Variáveis em **Project Settings → Environment Variables**, separadas por Production / Preview / Development.

---

## 11. Privacidade e RGPD

A CCLX é entidade portuguesa, RGPD aplica-se desde o primeiro registo.

### Dados pessoais recolhidos
| Origem | Dado | Tabela |
|---|---|---|
| Google OAuth (claim) | Email | `auth.users.email` |
| Google OAuth (claim, opcional) | Nome de exibição | `profiles.display_name` |
| Conclusão de aula | `user_id`, `lesson_id`, timestamp | `lesson_completions` |
| Acesso a curso | `user_id`, `course_id`, timestamp | `course_access_log` |
| Análise de tráfego | Páginas vistas, sem cookies | Vercel Analytics (cookieless) |

### Página `/privacidade` (V1)
Lista mínima:
- Que dados se recolhem e porquê
- Subprocessadores: Supabase, Vercel, Resend, YouTube
- Direitos do utilizador (acesso, exportação, eliminação) — pedidos por email
- Contacto de privacidade da CCLX

### Cookie consent
- **Vercel Analytics** é cookieless → não exige banner.
- **Supabase Auth** usa cookies estritamente necessários (sessão) → isentos de consentimento ao abrigo do ePrivacy.
- **Conclusão:** sem banner. A página `/privacidade` declara explicitamente este uso.

### Eliminação de conta
- V3: pedido manual por email → admin executa SQL de purga (`auth.users` + cascata).
- V5+: ponderar self-service.
- RGPD permite resposta em até 30 dias.
