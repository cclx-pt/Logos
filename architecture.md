# architecture.md — Logos

> **Quando atualizar:** após mudanças estruturais (novo serviço, alteração de modelo de dados, nova fronteira de segurança, mudança de stack).
> **Última atualização:** 14-06-2026 (V3.6 — pré-requisitos sequenciais: `courses.sequential_lessons` + `courses.sequential_modules` (independentes) + `courses.prerequisite_course_id`, aplicação server-side em `src/lib/courses/sequencing.ts`, ver §2 e §6)

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
│  • Auth (Google + email OTP)         │
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
 ├─ sequential_lessons (bool, V3.6: aulas em ordem dentro do módulo)
 ├─ sequential_modules (bool, V3.6: módulos em ordem; independente do anterior)
 ├─ prerequisite_course_id (FK → courses, nullable, V3.6: cadeia de cursos)
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
 ├─ template ('pdf' | 'video' | 'video_pdf' | …)
 ├─ youtube_url (nullable; obrigatório se o template tem vídeo)
 ├─ pdf_storage_path (nullable; null só quando template = 'video')
 ├─ required_tags[] (V4)
tags
 ├─ id (uuid, PK)
 ├─ label
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

**Estado actual do schema** (após V3 PR1+PR2, em `logos-dev`):

| Tabela | Migration | Estado em `logos-prod` |
|---|---|---|
| `profiles` + trigger sync | `20260514002002`, `20260514015528` | ✅ aplicada |
| `profiles` RLS fixes (recursão) | `20260514022124`, `20260514022734` | ✅ aplicada |
| `profiles` role mutation authority | `20260514030344` | ✅ aplicada |
| `tags` + `user_tags` + helper `current_profile_has_tag` | `20260518120000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| `courses`/`modules`/`lessons`/`*_completions`/`*_log` + helper `course_is_visible` + bucket `lesson-pdfs` | `20260519020000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| Drop `tags.slug` (UUID interno é suficiente) | `20260520120000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| Drop `courses.slug` (UUID em URLs públicas) | `20260520140000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| Storage RLS por path em `lesson-pdfs` (`lesson_pdfs_select_visible`) | `20260521000000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| `course_access_log` SELECT `select_own` (V3.1 T4) | `20260526180000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| Banner opcional em cursos + bucket `course-banners` + storage RLS por path | `20260527000000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |
| Pré-requisitos sequenciais: `courses.sequential_lessons` + `courses.sequential_modules` + `courses.prerequisite_course_id` (auto-FK, on delete set null) + CHECK não-auto-referência (V3.6) | `20260614140000` | ⏳ aplicada em `logos-dev`; pendente em `logos-prod` (sobe no lançamento V3) |

Migrations V3 sobem a `logos-prod` apenas no dia do lançamento (01-07-2026). Ver `feature-docs/branch-strategy.md`.

**Realtime + interruptor de live (V3.6):** a tabela singleton `live_override` (`id=1`, `is_live`, `video_id`, `armed_until`; migration `20260613120000`, **só `logos-dev`** até ao lançamento) guarda o estado que a equipa liga/desliga em `/admin/live` ("Estamos no ar"/"Terminámos"). Está na publicação `supabase_realtime` — **primeira utilização de Supabase Realtime no Logos**: o cliente subscreve via `src/lib/auth/browser-client.ts` (`subscribeToTable`, dentro da camada de identidade), pelo que o estado se propaga a todos os clientes em < 1s sem polling pesado. Reusa as env públicas do Supabase (sem infra nova). Escrita protegida por RLS (`current_profile_role() in ('admin','super_admin')`) e só feita por Server Actions admin; a leitura (`getLiveStatus` em `src/lib/youtube/`) é pura e nunca escreve.

**Helpers SQL (SECURITY DEFINER + STABLE) — única forma de policies tocarem `profiles`/`user_tags`:**

| Helper | Devolve | Usado em |
|---|---|---|
| `current_profile_id()` | uuid | Toda a policy que precisa do profile actual |
| `current_profile_role()` | text (`user`/`admin`/`super_admin`) | Gating de admin em tags, user_tags, courses, modules, lessons, completions, storage |
| `current_profile_has_tag(uuid[])` | boolean | Helper de visibilidade de cursos restritos |
| `course_is_visible(courses)` | boolean | Unifica regra de visibilidade em policies de `courses`/`modules`/`lessons` |
| `set_updated_at()` | trigger row | Anexado a `courses`/`modules`/`lessons` para gerir `updated_at` |

Todos `SECURITY DEFINER` (previnem recursão RLS — problema visto 3× em V2 PR2, resolvido com este padrão).

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

- **Supabase Auth** com **OAuth social (Google) + email OTP** — gere identidade (login via provider ou código de uso único, sessão, OAuth callback). Microsoft (Entra/Azure) foi acrescentado em 04-06-2026 e **removido em 10-06-2026** (decisão do líder: ficar só com Google + email). Apple adiado por exigir Apple Developer Program pago; login com **palavra-passe** continua fora de âmbito V1-V9 (`SPEC_1.md` §17/§18). O Google tem um wrapper de Server Action em `src/lib/auth/actions.ts` (`signInWithGoogleAction`); o registry `SIGN_IN_PROVIDERS` (`src/lib/auth/providers.ts`) alimenta todas as superfícies de login. Adicionar um provider no futuro = um wrapper de action + uma entrada no registry + credenciais no painel Supabase.
- **Email OTP (passwordless)** acrescentado em 07-06-2026 como segundo método: código de 6 dígitos enviado via SMTP do Supabase (Resend), fluxo de 2 passos (`sendEmailOtpAction` → `verifyEmailOtpAction` em `src/lib/auth/actions.ts`, componente `EmailOtpSignIn`, rota `/entrar?next=`). Anti-abuso: Cloudflare Turnstile (gated por `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) + rate-limit nativo do Supabase. Zero mudanças de DB — o trigger `on_auth_user_created` cobre também este caminho. Fica inerte até configurar SMTP + Email provider no Supabase (`feature-docs/email-otp-login.md` §5/§6).
- **Identidade isolada em `src/lib/auth/`** (V2): única parte da app que importa `@supabase/ssr`. Resto da app consome `getCurrentUser()` / `getServerClient()`. Quando a identidade migrar para uma shell externa, só esta camada muda.
- Papel guardado em `profiles.role` — fonte de verdade do Logos. RLS usa função helper `current_profile_id()` (STABLE em SQL) que faz o lookup `auth.uid() → profiles.external_auth_id → profiles.id`. As policies escrevem-se contra `current_profile_id()`, não contra `auth.uid()`. Quando a identidade vier de outra fonte, troca-se a implementação da função; as policies não mudam.
- **Primeiro Super Admin:** `joaocanelasribeiro@gmail.com`. Seed manual em cada ambiente após o primeiro login Google: corre-se o SQL versionado `supabase/seed/super-admin.sql.example` (cópia local não versionada como `super-admin.sql`) que faz `update profiles set role='super_admin' where external_auth_id = (select id from auth.users where email = 'joaocanelasribeiro@gmail.com')`. Daí em diante, super_admin promove os outros via UI dedicada (V2). Esta UI **não desaparece** quando a shell existir — papéis continuam fonte de verdade do Logos.
- **Entrada à área `/admin`:** item dedicado no **dropdown do utilizador** (no Header). Renderizado apenas se `profile.role !== 'user'`. Sem link na nav principal, sem sub-domain, sem aviso para utilizadores normais — coerente com "conteúdo restrito é invisível, não bloqueado" (`SPEC_1.md` §5).
- Sessão via cookies httpOnly geridos pela camada `lib/auth/`. **Middleware raiz** (`src/middleware.ts` + helper em `src/lib/auth/middleware.ts`) refresca o token Supabase em cada request — sem isto, sessões expiravam silenciosamente após ~1h.
- **Sincronização `auth.users → profiles`** (V2 PR2): trigger DB `on_auth_user_created AFTER INSERT ON auth.users` (`SECURITY DEFINER`, idempotente via `on conflict do nothing`, `display_name` via `coalesce(name, full_name, email)`). Cobre todos os caminhos: callback OAuth, criação por SQL admin, dashboard. Decisão revisada vs `feature-docs/auth-architecture.md` §5 (que propunha "Server Action + trigger") — Server Action a inserir exigiria `SUPABASE_SERVICE_ROLE_KEY` (RLS sem `for insert` policy); trigger sozinho cobre 100% sem novo segredo. Detalhes em `feature-docs/v2-auth.md` §2 "Decisão".

Esta separação entre **identidade** (quem és — pode migrar) e **autorização Logos** (o que podes fazer aqui — fica sempre cá) é a fronteira que torna possível migrar futuramente para identidade externa (ex.: shell partilhada CCLX) sem reescrever a app. Detalhes em `feature-docs/auth-architecture.md`.

Se a shell partilhada CCLX vier a oferecer email/password ou mais providers no futuro, beneficia-se automaticamente — a camada `lib/auth/` continua a ser substituída de uma vez, sem condicionar a decisão de scope que hoje limita o Logos a OAuth social (Google) + email OTP.

## 5. Visibilidade por etiquetas

**Regra única (V3 e V4):**
> Um item é visível se: `required_tags` está vazio **OU** o utilizador tem ≥ 1 etiqueta em `required_tags`.

- V3: avaliada apenas em `courses.required_tags`
- V4: avaliada recursivamente em `courses → modules → lessons`
- Itens-pai vazios desaparecem do catálogo

**Implementação (V3 PR2):** a regra acima vive numa **única função SQL** `course_is_visible(courses) → boolean` (STABLE + SECURITY DEFINER). Tanto as policies SELECT de `courses` como as de `modules` e `lessons` chamam este helper (estas últimas via subquery `EXISTS (SELECT 1 FROM courses c WHERE c.id = … AND course_is_visible(c))`). admin/super_admin saltam o filtro (vêem cursos draft + restritos para gerir). Quando V4 introduzir `required_tags` em módulos/aulas, a regra estende-se nesta função (não há tabelas a tocar nas policies).

**Estado "rascunho":** V3 separa estado de visibilidade em duas dimensões:
1. **`courses.published_at` nullable.** NULL = draft (invisível para users; visível para admin/super_admin). Set para `now()` ao publicar.
2. **Etiqueta WIP opcional** se o admin quiser draft mesmo *publicado* — anexa ao curso uma tag tipo `rascunho` e atribui-a só a si. Reutiliza o sistema de etiquetas, sem coluna nova.

## 6. Estado de conclusão

- `lesson_completions` é a fonte primária para conclusão por aula. Toggle binário (`markLessonCompleteAction` / `unmarkLessonCompleteAction`). RLS filtra por `current_profile_id()` — conclusão é acto pessoal (admin não marca por outros).
- "Curso concluído" é **detectado on-read** via `isCourseComplete(course, completedLessonIds)` (helper em `src/lib/courses/completion.ts`). Quando todas as aulas visíveis estão concluídas E não há row em `course_completions`, a página de curso insere uma — `completed_at` fica preservado para sempre. RLS de PR2 torna a row imutável (sem UPDATE/DELETE policies); desmarcar uma aula depois não apaga a conclusão original do curso.
- Helper `getOrCreateCourseCompletion(courseId)` faz select-then-insert idempotente, com 23505 trap para race entre dois page renders simultâneos. Falha silenciosa (retorna `null`) para não partir o render do banner. **V3.6:** a página de aula passa a chamar este helper assim que `isCourseComplete` é verdade (antes só a página de curso o fazia) - garante que `course_completions` existe a tempo de os pré-requisitos de outros cursos o lerem.

**Sequência e pré-requisitos (V3.6) — aplicação server-side, não em RLS.** A regra de progressão vive em `src/lib/courses/sequencing.ts` (funções puras: `getSequentialAccess` devolve `lockedLessonIds`/`lockedModuleIds` a partir do `CourseDetail` + set de aulas concluídas; `getFrontierLesson`/`findModuleOfLesson` resolvem o destino do redirect). As páginas de aula e de módulo redireccionam conteúdo bloqueado para a fronteira; a landing e `enrollAction` (gate de pré-requisito via `course_completions`) impedem entrar antes de o pré-requisito estar concluído. **Não está em RLS** pela mesma razão que a conclusão de curso: a regra é dinâmica e por utilizador, e metê-la em policies exigiria juntar `lesson_completions`/`course_completions` em cada SELECT de `lessons`/`modules`/`courses` sem ganho de segurança (o conteúdo continua protegido por etiqueta/role). Bloqueio **mostrado com cadeado**, ao contrário da invisibilidade por etiqueta (`SPEC_1.md` §5/§6). Ciclos de pré-requisito travados na Server Action (`validatePrerequisite` percorre a cadeia); auto-referência também por CHECK na BD.

## 7. Storage (PDFs e banners)

### 7.1 Bucket `lesson-pdfs` (V3 PR2)

- Bucket `lesson-pdfs` privado, **provisionado em V3 PR2** (migration `20260519020000`). Limites configurados: `file_size_limit = 20 MB`, `allowed_mime_types = ['application/pdf']`.
- URLs **assinados** com TTL curto (5 min) gerados em Server Action quando o utilizador clica em "Descarregar" (implementação fica em V3 PR6 onde mora a lógica de acesso por curso).
- **Upload directo (V3.7, browser → Storage).** O PDF **nunca passa por uma Server Action**: o `LessonForm` pede uma signed upload URL (`createLessonPdfUploadUrlAction`, admin-only) e envia o ficheiro directamente para o bucket via `uploadToSignedUrl` (wrapper em `src/lib/auth/browser-client.ts`). Motivo: a Vercel impõe um limite de **~4.5 MB ao corpo de Functions** que o `bodySizeLimit` do Next **não** sobrepõe — PDFs legítimos (5-20 MB) eram rejeitados na borda, antes de o código os ver (a UI prometia 20 MB). Create/update só recebem o `pdf_storage_path` (string) já validado (`validatePdfStoragePath`: tem de ser `<courseId>/<uuid>.pdf` com o prefixo do próprio curso); o tamanho (≤20 MB) e o MIME são impostos pelo **bucket** no upload. A INSERT RLS (admin-only) é satisfeita ao **assinar** com a sessão do admin; o token autoriza escrever só nesse path.
- Policies em `storage.objects` (já activas):
  - **SELECT** `lesson_pdfs_select_visible` (migration `20260521000000`): policy faz parsing do path (`split_part(name, '/', 1)` → `courseId`) e valida via `course_is_visible(courses)` — o mesmo helper SECURITY DEFINER que protege `lessons_select_visible`. Fecha o canal directo cliente → Storage (anon key + sessão de user já não consegue `createSignedUrl` ou `download` para PDFs de cursos invisíveis). A Server Action `getLessonPdfSignedUrlAction` mantém-se como ponto único de signing por ergonomia (TTL curto, single source), não por ser a fronteira de segurança.
  - **INSERT / UPDATE / DELETE** apenas admin/super_admin.
- Convenção de path: `<courseId>/<uuid>.pdf` — **mudou em V3.7** (era `<courseId>/<lessonId>.pdf`). O prefixo continua a ser o `courseId` (fronteira da policy SELECT); o nome do ficheiro passou a um **UUID aleatório** decidido ao assinar o upload, desligado do id da aula (que no create ainda não existe). Por isso a limpeza (delete, troca para vídeo, substituição de PDF) lê o `pdf_storage_path` **guardado na row** — já não o reconstrói a partir do id. O formato continua **security-sensitive**: qualquer alteração à convenção tem de actualizar a policy `lesson_pdfs_select_visible` **e** o `validatePdfStoragePath`.

### 7.2 Bucket `course-banners` (V3.2 PR1)

- Bucket `course-banners` privado, **provisionado em V3.2 PR1** (migration `20260527000000`). Limites: `file_size_limit = 5 MB`, `allowed_mime_types = ['image/jpeg', 'image/png', 'image/webp']`.
- Coluna `courses.banner_storage_path` (nullable) guarda o path do banner; quando NULL, a UI cai no fallback de icon Lucide (componente `CourseImage` em `src/lib/courses/course-image.tsx`).
- URLs **assinados** com TTL de 30 min (vs 5 min do PDF, porque banners aparecem em listagens — worth caching mais tempo). Helpers em `src/lib/courses/banner.ts`: `getBannerUrlsByPath(paths)` batched para listagens, `getBannerUrlForPath(path)` para single course. Falha do signing devolve Map vazio / null (UI cai para icon, não parte).
- Policies em `storage.objects`:
  - **SELECT** `course_banners_select_visible`: mesma técnica do PDF — `split_part(name, '/', 1)` → `courseId` → `course_is_visible(courses)`.
  - **INSERT / UPDATE / DELETE** apenas admin/super_admin.
- Convenção de path: `<courseId>/banner` (sem extensão; MIME via Content-Type). Security-sensitive — qualquer mudança requer update à policy.

## 8. Deploy e ambientes

| Ambiente | Branch | Frontend | Supabase | Notas |
|---|---|---|---|---|
| Produção | `main` | `logos.cclx.pt` | `logos-prod` | V2 live (auth + papéis + hub `/conteudos`). `NEXT_PUBLIC_SUPABASE_*` activos desde 14-05-2026. |
| V2.5 stored | `v2.5-copy-ux` | `logos-git-v2.5-copy-ux-jcrninjas-projects.vercel.app` | `logos-dev` | Aguarda testemunhos finais + títulos dos cards de `/conteudos` para mergear em `main`. |
| V3 dev | `v3-cursos` | `logos-git-v3-cursos-jcrninjas-projects.vercel.app` | `logos-dev` | Inteira a desenvolver-se aqui até 01-07-2026. Não mergea em `main` em parciais. |
| Outras previews | feature branches | `logos-<hash>-jcrninjas-projects.vercel.app` (Vercel scope Preview) | `logos-dev` | Vercel cria automático por push. |
| Local | — | `localhost:3000` | `logos-dev` | `.env.local` (gitignored); espelhado em Vercel scope Development para `vercel env pull` |

Estratégia de 3 camadas (com regras de promoção V2→V2.5→V3 e workflow de teste em outros dispositivos) em `feature-docs/branch-strategy.md`. Bootstrap Vercel (env vars por scope, visibilidade do repo, gotcha do CLI em Claude Code) em `feature-docs/vercel.md`.

**DNS (Hostinger):**
- CNAME `logos.cclx.pt → 00f4337193415fe7.vercel-dns-017.com` activo desde 12-05-2026.
- TXT (SPF) e CNAME (DKIM) para Resend — **pré-condição do login por email OTP** (SMTP custom do Supabase via Resend); passos em `feature-docs/email-otp-login.md` §5. Até lá o OTP fica inerte.

**Migrations:**
- `supabase/migrations/*.sql` no Git (Supabase CLI).
- `pnpm dlx supabase db push` aplica a `logos-dev` (CLI está linkada via `supabase/.temp/`).
- Aplicação a `logos-prod` é **manual e deliberada**, **só** após PR mergear em `main`. Migrations V3 (PR1+PR2 e futuras) ficam **apenas** em `logos-dev` até 01-07-2026; vão a `logos-prod` no merge final de V3.

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
