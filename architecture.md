# architecture.md — Logos

> **Quando atualizar:** após mudanças estruturais (novo serviço, alteração de modelo de dados, nova fronteira de segurança, mudança de stack).
> **Última atualização:** 28-04-2026

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
│  Next.js 15 (App Router) + TS        │
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
│  • Auth (email + Google OAuth)       │
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
 ├─ created_by (admin)
user_tags
 ├─ user_id (FK → auth.users)
 ├─ tag_id (FK → tags)
 ├─ assigned_by, assigned_at
 ├─ PK (user_id, tag_id)
lesson_completions
 ├─ user_id, lesson_id (PK composto)
 ├─ completed_at
course_completions
 ├─ user_id, course_id (PK composto)
 ├─ completed_at (primeira vez; preservado)
course_access_log  -- contabilização leve V3
 ├─ user_id, course_id, accessed_at
profiles  -- extensão de auth.users
 ├─ user_id (PK), display_name, role ('user'|'admin'|'super_admin')
```

**IDs estáveis:** todos os IDs são UUIDs gerados pela DB. Renomear/reordenar nunca afeta `lesson_completions`.

## 3. Camadas e responsabilidades

| Camada | Responsabilidade |
|---|---|
| **Server Components** | Fetch de dados públicos (catálogo, detalhe de curso) com cache do Next |
| **Server Actions** | Mutações: `markLessonComplete`, CRUD admin, gestão de etiquetas |
| **Route Handlers `/api`** | Webhooks (Resend, futuros), endpoints assinados |
| **RLS no Postgres** | Última linha de defesa: utilizador só lê o que pode ver |
| **Lógica de visibilidade** | Função única `getVisibleCoursesForUser(userId)` reutilizada em catálogo, detalhe e cálculo de conclusão |

## 4. Autenticação e papéis

- **Supabase Auth** com email/password e Google OAuth
- Papel guardado em `profiles.role`; espelhado em JWT custom claim para uso em RLS
- **Super Admin** é seed manual; promove/despromove via UI dedicada
- Sessão via cookies httpOnly (Next.js middleware)

## 5. Visibilidade por etiquetas

**Regra única (V3 e V4):**
> Um item é visível se: `required_tags` está vazio **OU** o utilizador tem ≥ 1 etiqueta em `required_tags`.

- V3: avaliada apenas em `courses.required_tags`
- V4: avaliada recursivamente em `courses → modules → lessons`
- Itens-pai vazios desaparecem do catálogo

## 6. Estado de conclusão

- `lesson_completions` é a fonte primária
- `course_completions.completed_at` é gravado na **primeira** vez que todas as aulas visíveis estão concluídas; preservado para sempre
- Recalculado *on-read* quando o utilizador entra na página do curso (não há cron job)

## 7. Storage de PDFs

- Bucket `lesson-pdfs` (privado)
- URLs **assinados** com TTL curto (ex. 5 min) gerados em Server Action quando o utilizador clica em "Descarregar"
- A política RLS do bucket reflete a visibilidade da aula

## 8. Deploy e ambientes

| Ambiente | Branch | URL |
|---|---|---|
| Produção | `main` | `logos.cclx.pt` |
| Preview | feature branches | `<branch>-logos.vercel.app` |
| Local | — | `localhost:3000` |

DNS: CNAME `logos.cclx.pt → cname.vercel-dns.com` (Hostinger).

## 9. Decisões adiadas

- Drizzle ORM vs cliente Supabase puro → manter cliente até houver dor real
- Sentry → adiar para V2+
- Backup pago do Supabase → reavaliar com utilizadores reais
- Projeto Supabase único vs dev/prod separados → decidir na fase de Setup

Ver também: `SPEC_1.md` §17.
