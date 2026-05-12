# supabase — Bootstrap de projetos e CLI

> **Versão:** Setup (pré-V1) · **Concluída em:** 09-05-2026 · **Estado:** dois projetos provisionados, CLI inicializado, primeira migration vazia em `supabase/migrations/`

## 1. Objetivo

Provisionar a infraestrutura Supabase que vai sustentar Postgres, Auth (Google OAuth — único provider, ver `SPEC_1.md` §17/§18) e Storage (PDFs das aulas), e configurar o fluxo de migrations versionadas para que o schema do Logos seja construído de forma reproduzível.

## 2. Projetos provisionados

Foram criados **dois** projetos isolados, em `eu-west-3` (Paris — região europeia mais próxima de Portugal):

| Projeto | Ref | URL | Uso |
|---|---|---|---|
| `logos-dev`  | `dknrnqyqlojvnhspwjrd` | `https://dknrnqyqlojvnhspwjrd.supabase.co` | Desenvolvimento local + Vercel Preview deploys |
| `logos-prod` | `tirzriuabfwzqxtjsmfb` | `https://tirzriuabfwzqxtjsmfb.supabase.co` | Produção (Vercel `main` deploy) |

A separação está fixada em `SPEC_1.md` §11 e `architecture.md` §8. Não usar o mesmo projeto para dev e prod — `auth.users` da Supabase é per-project e queremos isolar utilizadores reais de testes.

### Free tier

Ambos os projetos correm em plano gratuito ($0/mês). Limites por projeto: 500 MB DB, 1 GB storage, 2 GB egress/mês, 50 000 MAUs. Ver `SPEC_1.md` §16: aceitável para o primeiro ano de operação. **Sem backups automáticos** — risco aceite até existirem utilizadores reais (registado em `status.md` ⚠️ Riscos).

## 3. Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # APENAS server-side
SUPABASE_STORAGE_BUCKET=lesson-pdfs
```

### Publishable key vs legacy `anon`

A Supabase recomenda agora a **publishable key** (`sb_publishable_*`) em vez da legacy `anon` (JWT). Razões: melhor segurança, rotação independente, formato distinguível em logs. Ambas funcionam — o cliente Supabase aceita as duas. Vamos usar a moderna em todos os ambientes.

`NEXT_PUBLIC_*` é exposta ao browser (Next.js convention). É segura porque RLS é a camada que protege dados. **Nunca** pôr `SUPABASE_SERVICE_ROLE_KEY` num `NEXT_PUBLIC_*` — bypassa RLS e dá acesso total à DB.

### Como configurar localmente

1. Copia `.env.example` para `.env.local`:
   ```bash
   cp .env.example .env.local
   ```
2. No painel da Supabase (`logos-dev` → Project Settings → API), copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **API keys → publishable** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - **API keys → service_role (legacy)** → `SUPABASE_SERVICE_ROLE_KEY`
3. `.env.local` está em `.gitignore` — nunca commitar.

### Como configurar em Vercel

Quando a tarefa "Criar conta Vercel e ligar ao repositório" estiver concluída, configurar Environment Variables no painel Vercel separadas por ambiente:

| Var | Production | Preview | Development |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `logos-prod` URL | `logos-dev` URL | `logos-dev` URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `logos-prod` key | `logos-dev` key | `logos-dev` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `logos-prod` SR key | `logos-dev` SR key | `logos-dev` SR key |
| `SUPABASE_STORAGE_BUCKET` | `lesson-pdfs` | `lesson-pdfs` | `lesson-pdfs` |

**Cuidado em Preview deploys:** este projeto vai pôr previews a apontar para `logos-dev` (não `logos-prod`). Para que isso funcione, é importante que migrations sejam aplicadas a `logos-dev` antes de abrir PR — caso contrário, o preview fica desalinhado com o código.

## 4. Supabase CLI no repo

A CLI é executada via `pnpm dlx` (sem instalação global): `pnpm dlx supabase <comando>`. A primeira execução faz download do binário (`supabase_windows_amd64.tar.gz` ou equivalente) para o cache do pnpm; subsequentes são rápidas.

> **Alternativa global:** `winget install Supabase.CLI` ou `scoop install supabase`. `pnpm dlx` evita poluir a máquina mas paga um cache miss inicial — escolha do developer.

### Estrutura criada por `supabase init`

```
supabase/
├── config.toml                       # config local (project_id, ports, schemas)
└── migrations/
    └── 20260509175745_initial.sql    # primeira migration (placeholder vazia com comentários)
```

`config.toml` define:
- `project_id = "Logos"` — nome local (não confundir com refs de logos-dev/logos-prod).
- API local em `localhost:54321`, DB em `localhost:54322` quando se correr `supabase start`.
- Schemas expostos: `public`, `graphql_public`.

### Workflow de migrations

```bash
# Criar migration nova
pnpm dlx supabase migration new <nome>          # cria YYYYMMDDhhmmss_<nome>.sql vazio

# Aplicar a logos-dev (após linkar uma vez)
pnpm dlx supabase link --project-ref dknrnqyqlojvnhspwjrd
pnpm dlx supabase db push                        # aplica todas migrations pendentes

# Aplicar a logos-prod (depois de testar em dev)
pnpm dlx supabase link --project-ref tirzriuabfwzqxtjsmfb
pnpm dlx supabase db push
```

**Regra dura:** prod só aplica depois de PR mergido em `main` e dev validado. Sem auto-apply em prod (registado em `architecture.md` §8). Passo manual e deliberado.

### Linkagem alternativa (sem mudar de project entre comandos)

```bash
pnpm dlx supabase db push --db-url "postgres://postgres:<password>@db.<ref>.supabase.co:5432/postgres"
```

Útil em CI/CD futuro mas exige password (a obter em Project Settings → Database).

## 5. Primeira migration

`supabase/migrations/20260509175745_initial.sql` é um **placeholder com apenas comentários**. Razão: validar end-to-end que o pipeline funciona (gerar nova migration → aplicar a dev → aplicar a prod) antes de existir schema real para validar o caminho.

O schema verdadeiro chega por versão:

- **V2** — `profiles` (`id` PK, `external_auth_id` UNIQUE, `display_name`, `role`, `created_at`); `tags`; `user_tags`. Função `current_profile_id()` STABLE em SQL. Trigger `on_auth_user_created` para sincronização defensiva `auth.users → profiles`. RLS policies em `user_tags` (`user_id = current_profile_id()`). Detalhes em `feature-docs/auth-architecture.md`.
- **V3** — `courses`, `modules`, `lessons` (com `template`, `youtube_url`, `pdf_storage_path`, `required_tags` em `courses`), `lesson_completions`, `course_completions`, `course_access_log`. RLS policies para visibilidade por etiquetas e per-user em conclusões.
- **V4** — adicionar `required_tags` em `modules` e `lessons` (migration aditiva, sem mexer em dados existentes).

## 6. Storage

Bucket `lesson-pdfs` (privado) ainda **não foi criado**. Vai ser criado em V3 com migration que faz `insert into storage.buckets ...` + RLS policies do bucket reflectindo visibilidade da aula. Detalhes em `architecture.md` §7.

## 7. Auth

Configuração no painel Supabase `logos-dev` e `logos-prod` será feita em V2:

- **Google OAuth** — único provider habilitado. Criar OAuth App no Google Cloud Console; copiar Client ID + Secret para Supabase Auth → Providers → Google. URL de callback: `https://<ref>.supabase.co/auth/v1/callback`. Pré-condição V2 registada em `status.md` ⏭️ Próximas tarefas.

Email/password e outros providers (Apple, Microsoft, etc.) estão **fora de âmbito V1-V9** (`SPEC_1.md` §17/§18). A decisão é consciente para reduzir esforço V2 e eliminar dependências em Resend/DNS. Reabrir apenas se o ministério explicitamente pedir inclusão.

Por agora, ambos os projetos têm Auth provisionado (built-in) mas sem providers habilitados além do default.

## 8. Limites conhecidos

- **Sem `supabase start` local automatizado.** Não corremos a stack Supabase em Docker localmente; usamos `logos-dev` remoto como o ambiente de dev. Razão: simplicidade para developer único; reavaliar se a equipa crescer ou se alguém precisar de testar offline.
- **Migrations são idempotentes na prática** mas não há validação automática. Quando V2 começar, considerar testes contra Supabase local (`supabase start` apenas para CI).
- **Senha da DB ainda não foi capturada.** Para `db push` via URL Postgres direta (alternativa em §4), o user precisa de gerar/recuperar a password no painel (Project Settings → Database → Reset password).
- **`mcp__plugin_supabase_supabase__apply_migration`** existe e poderia aplicar a migration via MCP, mas escolhemos manter o fluxo via Supabase CLI por reproducibilidade local.

## 9. Operação dia-a-dia

### Verificar status dos projetos

```bash
# Via CLI (após link)
pnpm dlx supabase projects list

# Via MCP (se disponível na sessão)
# mcp__plugin_supabase_supabase__list_projects
```

### Aceder ao painel

- `logos-dev`: https://supabase.com/dashboard/project/dknrnqyqlojvnhspwjrd
- `logos-prod`: https://supabase.com/dashboard/project/tirzriuabfwzqxtjsmfb

### Backups

**Não existem no plano gratuito.** Estratégia até existirem utilizadores reais:
- Cada migration está versionada em `supabase/migrations/` (recuperável).
- Dados de teste em `logos-dev` são descartáveis.
- Para `logos-prod` antes de utilizadores reais: snapshot manual via `pg_dump` é viável mas não automatizado.

Quando subir para Supabase Pro (~$25/projeto/mês), backups diários ativam-se automaticamente.

## 10. Referências

- `SPEC_1.md` §11 — stack técnica (Supabase listado).
- `SPEC_1.md` §16 — restrição: 2 projetos, plano gratuito, sem backups no V1.
- `architecture.md` §8 — tabela de ambientes (Production / Preview / Local) com mapeamento dos projetos Supabase.
- `architecture.md` §2 — modelo de dados que estas migrations vão materializar.
- `feature-docs/auth-architecture.md` — fronteira identidade vs autorização (impacto em RLS policies).
- [Supabase CLI docs](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Supabase API keys guide](https://supabase.com/docs/guides/api/api-keys)
