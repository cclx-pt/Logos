# V3 — Plataforma de Cursos (plano)

> **Branch:** `v3-cursos` (base: `v2.5-copy-ux`, próxima base: `main` quando V2.5 mergear).
> **Prazo absoluto:** 01-07-2026 (ver `SPEC_1.md` §1, §9).
> **Fonte:** `SPEC_1.md` §9 (V3), `architecture.md` §2 (modelo de dados), §5 (visibilidade), §6 (conclusão), §7 (storage).
> **Estado:** PR1 + PR2 + PR3 + PR4 (a + IA + b) + PR5 concluídas em 19-05-2026. 3 PRs restantes (PR6+PR7 gate, PR8+PR9 polish). Aplicado apenas a `logos-dev`; `logos-prod` continua schema V2 conforme `feature-docs/branch-strategy.md`.

## 0. Resumo

V3 entrega o **conteúdo** do LOGOS: Cursos → Módulos → Aulas com vídeo YouTube embebido e apostila em PDF, restrição de acesso por etiqueta (apenas a nível de curso em V3; módulo/aula em V4), conclusão binária por aula, ecrã "Curso Concluído" e contabilização leve de acessos.

V2 PR4 (etiquetas, fundação) ainda não foi construída — fica absorvida em V3 PR1 porque V3 depende dela.

Trabalhamos em 9 PRs pequenas e sequenciais, cada uma ship-able sozinha (testes verdes, CI verde, preview Vercel funcional). A ordem é deliberada: cada PR é um pré-requisito da seguinte.

| # | PR | Tema | Estado | Bloqueia |
|---|---|---|---|---|
| 1 | V3 PR1 | Etiquetas (DB + admin CRUD + assign a utilizadores) | ✅ 19-05-2026 | tudo o resto |
| 2 | V3 PR2 | Schema cursos/módulos/aulas + Storage `lesson-pdfs` + RLS | ✅ 19-05-2026 | PR3-7 |
| 3 | V3 PR3 | Admin: CRUD de Cursos (com `required_tags`) | ✅ 19-05-2026 | PR4 |
| 4a | V3 PR4a | Admin: CRUD de Módulos (dentro de `/admin/conteudos/[courseId]`, setas ↑↓) | ✅ 19-05-2026 | PR4-IA |
| 4-IA | V3 PR4-IA | Restructure admin: `/admin/cursos*` → `/admin/conteudos*` (drill-down) | ✅ 19-05-2026 | PR4b |
| 4b | V3 PR4b | Admin: CRUD de Aulas (PDF upload, YouTube URL, coerência de template) | ✅ 19-05-2026 | PR5 |
| 5 | V3 PR5 | Catálogo público em `/conteudos` (substitui o "Em breve") | ✅ 19-05-2026 | PR6 |
| 6 | V3 PR6 | Página de curso + página de aula (YouTube + PDF + nav) | ⏳ | PR7 |
| 7 | V3 PR7 | Conclusão binária + ecrã "Curso Concluído" | ⏳ | PR8 |
| 8 | V3 PR8 | `course_access_log` + stats admin básicas | ⏳ *(polish)* | — |
| 9 | V3 PR9 | Vercel Analytics + Playwright E2E (happy-path) | ⏳ *(polish)* | — |

PRs 1-7 são *gates* para o prazo: sem elas, V3 não existe. PRs 8-9 são *polish*: se o prazo apertar, V3 abre com PR7 funcional e PR8-9 caem para V3.1.

---

## 1. V3 PR1 — Etiquetas (fundação) ✅ 19-05-2026

**Concluída em** commit `3afb750`. Migration `20260518120000_tags_and_user_tags.sql` em `logos-dev`. Absorveu o trabalho de `feature-docs/v2-auth.md` §4 (V2 PR4).

### Entregue
- DB: `tags` (label 1-80, created_by → profiles restrict — slug retirado em 20-05-2026 via migration `20260520120000_drop_tags_slug.sql`; identificação interna por uuid), `user_tags` (PK composta, assigned_by, cascade em user_id/tag_id), helper `current_profile_has_tag(uuid[])` STABLE + SECURITY DEFINER (usado em PR2).
- RLS: super_admin escreve em `tags`; admin+super_admin escrevem em `user_tags`. User vê apenas as suas etiquetas (mantém invisibilidade de tags que não possui).
- UI: `/admin/etiquetas` super_admin-only (create + edit `?editar=<id>` + delete `?apagar=<id>`, server-side puro). `/admin/utilizadores` relaxa para admin+super_admin com coluna de pills + select nativo para assign/unassign.
- Server Actions: `createTagAction`/`updateTagAction`/`deleteTagAction` (super_admin); `assignTagAction`/`unassignTagAction` (admin+super_admin, upsert idempotente).
- 21 testes (12 em `etiquetas/actions.test.ts`, 8 em `utilizadores/actions.test.ts`, 1 ajuste em `layout.test.tsx`).

### Não-âmbito
- Atribuir etiquetas a cursos — esse passo entra na V3 PR3.
- Etiquetas a nível de módulo/aula — V4.

---

## 2. V3 PR2 — Schema base + storage ✅ 19-05-2026

**Concluída em** commit `502f139`. Migration `20260519020000_v3_courses_schema_and_storage.sql` em `logos-dev`. **NÃO** aplicada a `logos-prod` (V3 sobe a prod só no merge final).

### Entregue
- DB:
  - `courses` (slug unique CHECK 2-80, title 1-120, `required_tags uuid[]` default `{}`, `published_at` nullable, created_by → profiles restrict, índice parcial em `published_at IS NOT NULL`).
  - `modules` (course CASCADE, position int>=0, índice composto `(course_id, position)`).
  - `lessons` (module CASCADE, template CHECK `pdf|video_pdf`, youtube_url nullable, `pdf_storage_path` **not null** — V3 exige apostila, CHECK `video_pdf ⇒ youtube_url IS NOT NULL`).
  - `lesson_completions` PK composta (idempotente).
  - `course_completions` PK composta, **imutável** (sem policy UPDATE/DELETE — `SPEC_1.md` §9 V3 exige preservar data).
  - `course_access_log` sem unique, índices em `course_id` e `accessed_at desc` para stats em PR8.
- Trigger genérico `set_updated_at()` anexado a courses/modules/lessons.
- Helper `course_is_visible(courses) → boolean` STABLE + SECURITY DEFINER unifica a regra (admin tudo; user só `published_at IS NOT NULL` E `required_tags = '{}' OR current_profile_has_tag(...)`). Reutilizado em policies de `courses`, `modules` e `lessons` (estas duas via subquery `EXISTS`).
- RLS:
  - `courses`/`modules`/`lessons` SELECT via `course_is_visible`; INSERT/UPDATE/DELETE admin+super_admin.
  - `lesson_completions` SELECT próprias ou admin/super_admin; INSERT/DELETE **só o próprio** (conclusão é acto pessoal — admin não marca por outros).
  - `course_completions` SELECT próprias ou admin/super_admin; INSERT só o próprio; sem UPDATE/DELETE (imutável).
  - `course_access_log` SELECT só admin/super_admin (auditoria); INSERT só o próprio; sem UPDATE/DELETE.
- Storage: bucket `lesson-pdfs` privado, `file_size_limit = 20 MB`, `allowed_mime_types = ['application/pdf']`. Policies em `storage.objects`: SELECT authenticated qualquer profile (acesso fino fica na Server Action de PR6 que valida `course_is_visible` antes de `createSignedUrl`); INSERT/UPDATE/DELETE só admin+super_admin.

### Sem código novo
73/73 testes continuam verdes (PR é puramente DB/storage). Validação RLS acontece em PR3-PR7 quando a UI existir.

### Não-âmbito
- UI alguma — esta PR é apenas schema + storage, ship-able sem mudar a UI.

---

## 3. V3 PR3 — Admin CRUD de Cursos ✅ 19-05-2026

**Concluída em** `v3-cursos` (sem migrations novas — só UI por cima do schema da PR2).

### Entregue
- `/admin/cursos` listagem (admin + super_admin) com colunas Título / Slug / Estado (Publicado vs Rascunho) / Etiquetas resolvidas para labels / Criado em / Editar.
- `/admin/cursos/novo` form server-side: title, slug (kebab-case regex), description (textarea texto puro, ≤ 4000), icon (Lucide name livre, opcional ≤ 64), `required_tags` via checkboxes alimentados pelas tags da PR1, toggle "Publicado". Redirect para `/admin/cursos/<id>` após sucesso.
- `/admin/cursos/[id]` partilha o mesmo `course-form.tsx` server component. UUID inválido ou curso inexistente → `notFound()`.
- "Zona de perigo" na página de edição: hard delete confirmado via `?confirmar=apagar` URL param — mesmo padrão server-side de `/admin/etiquetas`, sem Client Components ou shadcn AlertDialog. Hard delete usa CASCADE da FK em modules/lessons/completions.
- Server Actions `createCourseAction` / `updateCourseAction` / `deleteCourseAction` em `src/app/admin/cursos/actions.ts` com validação inline (sem Zod — convenção do codebase): slug 2-80 regex, title 1-120, description ≤ 4000, icon ≤ 64, required_tags UUID-checked + dedup; defesa de role admin+super_admin; mensagem clara para slug duplicado (Postgres 23505); `created_by = caller.id` no insert.
- Regra `published_at` "primeira publicação preservada": toggle off ⇒ NULL; toggle on com `published_at` actual ⇒ mantém data; toggle on com NULL anterior ⇒ `now()`. Minimiza churn da data publicada em re-edições.
- Link "Cursos" na navegação do `AdminLayout` agora visível a admin **e** super_admin (Etiquetas/Utilizadores continuam super_admin only).
- 13 testes em `cursos/actions.test.ts` + 3 ajustes em `layout.test.tsx`. 89/89 verdes.

### Não-âmbito (passa para PRs seguintes)
- Módulos/aulas dentro do curso — V3 PR4.
- Catálogo público que mostra estes cursos a utilizadores — V3 PR5.
- Página de curso/aula com vídeo + PDF — V3 PR6.

### Decisões fechadas durante a PR
- **Sem Zod.** O codebase usa validadores inline em `etiquetas/actions.ts` e `utilizadores/actions.ts`; manter consistência supera o ganho marginal de adicionar `zod`.
- **AlertDialog ⇒ confirmação server-side via URL param.** O padrão de `/admin/etiquetas` (`?apagar=<id>`) já estava estabelecido; reusar evita um Client Component só para confirmar um delete.
- **`required_tags` como checkboxes em `<fieldset>`** em vez de `<select multiple>` — melhor acessibilidade, mantém server-side, lê via `formData.getAll('required_tags')`.

---

## 4. V3 PR4 — Admin CRUD de Módulos + Aulas

PR4 foi dividida em sub-iterações sequenciais (19-05-2026, ver `branch-strategy.md` §4 — cada uma ship-able sozinha em `v3-cursos` com preview Vercel testável em telemóvel antes de avançar). Entre PR4a e PR4b entrou um passo de IA (PR4-IA) a pedido do user porque o admin não estava intuitivo: drill-down estilo Finder com cursos sempre visíveis na coluna esquerda.

### 4-IA. V3 PR4-IA — Restructure para Conteúdos (drill-down) ✅ 19-05-2026

Mudança de informação-arquitectura. A área admin perde `/admin/cursos*` e ganha `/admin/conteudos*` com modelo drill-down:

- **Sidebar admin:** "Cursos" → "Conteúdos" (`/admin/conteudos`).
- **`/admin/conteudos`** — landing: lista de cursos em tabela, botão "Novo curso" no topo, link de cada curso navega para `/admin/conteudos/<id>`.
- **`/admin/conteudos/novo`** — form `CourseForm` em modo create, com `CoursesColumn` à esquerda em desktop (e breadcrumb `Cursos › Novo curso` em mobile).
- **`/admin/conteudos/[courseId]`** — drill-down: à esquerda `CoursesColumn` com o curso actual destacado (`md:block`, escondido em mobile); à direita secção "Módulos" (form novo + lista numerada com ↑↓/editar/apagar) + secção "Detalhes do curso" (CourseForm em modo edit) + "Zona de perigo".
- **Mobile:** colunas escondem (`md:hidden`/`md:block`); breadcrumb dá navegação para trás. Aceita-se um pouco de aperto em ecrãs ≥768 mas <1024 (sidebar admin 224 + coluna cursos 224 + main flex-1; gap-6).
- **Server Actions:** mantêm-se intactas (criadas na PR4a). Renomeadas para `courses-actions.ts` e `modules-actions.ts` no top-level de `/admin/conteudos` (em vez de `actions.ts` por subdirectório) porque a página `[courseId]/page.tsx` usa ambas. Strings `revalidatePath('/admin/cursos*')` → `/admin/conteudos*`. Imports nos testes actualizados (`from './actions'` → `from './courses-actions'` ou `'./modules-actions'`). Assertions sobre revalidatePath actualizadas.
- **Tests:** 18 testes da PR4a continuam verdes com paths novos (107/107).

### 4a. V3 PR4a — Módulos

- `/admin/cursos/[id]` ganha secção **Módulos** abaixo do form de curso — listagem ordenada por `position` com:
  - Form "Novo módulo" no topo (title + description opcional).
  - Linha em modo edit via `?editar=<moduleId>` (mesma URL, sem `[…]/editar`; padrão consistente com `/admin/etiquetas`).
  - Linha em modo apagar via `?apagar=<moduleId>` (confirmação inline).
  - Setas ↑↓ que chamam `moveModuleUpAction`/`moveModuleDownAction` (swap de `position` com o vizinho; no-op se já está nos extremos).
- Server Actions em `src/app/admin/cursos/[id]/modules/actions.ts`: `createModuleAction`, `updateModuleAction`, `deleteModuleAction`, `moveModuleUpAction`, `moveModuleDownAction`. Triple defesa: role check + RLS + CHECK constraints.
- Nova `position` ao criar = `max(position) + 1` no curso (0 se vazio). Race mínima aceitável (admin único, mutex implícito da UI).
- 8-10 testes em `actions.test.ts` (validators, role guard, swap, no-op nos extremos).

### 4b. V3 PR4b — Aulas ✅ 19-05-2026

**Concluída em** `v3-cursos` (sem migrations novas — só UI + Server Actions por cima do schema e bucket da PR2).

#### Entregue
- `/admin/conteudos/[courseId]/[moduleId]` — drill-down de aulas dentro do módulo (admin+super_admin). Breadcrumb mobile `Cursos › Curso › Módulo`. Header com back-link "← {curso}". Listagem ordenada por `position` com pill do template (`só pdf` / `vídeo + pdf`) e URL do YouTube linkado quando aplicável.
- Form "Nova aula" no topo (`encType="multipart/form-data"`): `title`, `description` (opcional), `template` (radios `pdf` ↔ `video_pdf`), `youtube_url` (sempre visível com hint "obrigatório se template = Vídeo + PDF"), file `accept="application/pdf"` obrigatório.
- Edit inline via `?editar=<lessonId>` — mesma estrutura do form de create, com file input opcional e legenda "Deixar vazio mantém a apostila actual". Cancel link volta a `/admin/conteudos/[courseId]/[moduleId]`.
- Delete inline via `?apagar=<lessonId>` — confirm com aviso de remoção do PDF e conclusões associadas. Best-effort `storage.remove()` após delete (se falhar, fica órfão até limpeza manual).
- Setas ↑↓ (forms server-action) com no-op nos extremos. Verificação de `module_id` recebido vs `module_id` real da aula antes de mover (`A aula não pertence ao módulo indicado.`).
- Server Actions em `src/app/admin/conteudos/lessons-actions.ts`: `createLessonAction`, `updateLessonAction`, `deleteLessonAction`, `moveLessonUpAction`, `moveLessonDownAction`. Triple defesa: role admin+super_admin, RLS em `lessons`, CHECK constraints DB.
- Upload PDF: insert primeiro com `pdf_storage_path = 'pending-<ts>'` (placeholder para satisfazer NOT NULL), upload para `lesson-pdfs/<courseId>/<lessonId>.pdf` com `upsert: true` e `contentType: 'application/pdf'`, depois update do path. Em falha de upload faz rollback (`delete eq id`). Em update, file vazio mantém o `pdf_storage_path` actual via lookup prévio.
- Coerência de template como decidido a 19-05-2026: `pdf → video_pdf` rejeita sem `youtube_url`; `video_pdf → pdf` força `youtube_url = null`. PDF mantém-se em ambos.
- Regex YouTube aceita `https://youtu.be/<id>` e `https://www.youtube.com/watch?v=<id>` (case-insensitive, id ≥ 6 chars). Domínios alternativos (Vimeo, Loom, etc.) são rejeitados.
- `ConteudosBreadcrumb` estendido com `courseId` + `moduleTitle`; curso passa a `<Link>` quando há módulo. Linha de módulo no `[courseId]/page.tsx` ganha botão **Aulas →** em borda laranja.
- 17 testes em `lessons-actions.test.ts` (107 → 124 verdes): create (role, template inválido, video_pdf sem URL, URL não-YouTube, PDF em falta, MIME errado, > 20 MB, happy path, falha de upload), update (role, coerência pdf→video_pdf, coerência video_pdf→pdf, novo PDF anexado), delete (apaga DB + bucket + revalida), move (swap, no-op no primeiro, rejeita module mismatch).

#### Não-âmbito
- Etiquetas a nível de aula — V4.
- Q&A por aula — V5.
- Limpeza periódica de PDFs órfãos do bucket — deferida; admin único, baixo risco.

#### Decisões fechadas durante a PR
- **Form server-side puro com `youtube_url` sempre visível.** Esconder/mostrar consoante o template exigiria Client Component só para um toggle. O action ignora `youtube_url` quando template = `pdf` (define `null` no DB), portanto utilizadores podem deixá-lo preenchido sem efeito.
- **`pdf_storage_path` placeholder + rollback.** O schema PR2 exige NOT NULL e nós queremos o id real no nome do ficheiro. Insert com placeholder → upload com `<id>` → update do path → rollback em falha de upload. Alternativa seria uploadar primeiro para um path temp e renomear, mas Supabase Storage não tem rename atómico, ficaria mais frágil.
- **`storage.remove` em delete é best-effort.** Se falhar, o registo já saiu da DB e o PDF fica órfão. Aceitável dado que admin é único voluntário; reavaliar em V8 (stats) se ficar uma colecção significativa.

---

## 5. V3 PR5 — Catálogo público ✅ 19-05-2026

**Concluída em** `v3-cursos` (sem migrations novas — só UI + helper por cima da RLS da PR2).

### Entregue
- Helper canónico `src/lib/courses/visibility.ts` com `getVisibleCoursesForUser({ query? })`. **Não duplica** a regra de visibilidade — delega na policy `course_is_visible(courses)` criada em PR2. Só agrega: nome, descrição, ícone, `hasLessons` (via embed PostgREST `modules ( lessons ( count ) )` em um único round-trip). Pesquisa opcional via `.ilike('title', '%q%')`, trimmed + máximo 80 chars; vazio/whitespace ignora o filtro. Wildcards `%`/`_` no input são pattern-matching intencional.
- Registry de ícones extraído de `icon-picker.tsx` para `src/lib/courses/icons.tsx` partilhado. `<CourseIcon slug={...} className={...} />` renderiza o Lucide correcto (fallback BookOpen para slugs desconhecidos). `IconPicker` no admin agora importa `COURSE_ICONS` da nova fonte (sem duplicação).
- `/conteudos/page.tsx` deixa de ser placeholder e passa a Server Component: lê `searchParams.q`, chama o helper, passa `courses + query` ao `<ConteudosContent />`.
- `/conteudos/conteudos-content.tsx` (`'use client'`, mantém animações `motion/react`): intro do ministério + form `<motion.form method="get" action="/conteudos">` com `<input type="search" name="q">` e botão "Pesquisar" (+ link "Limpar" quando filtro activo). Grid responsivo 1 / 2 / 3 colunas (mobile / sm / lg) de cards com ícone, título, descrição (line-clamp-4) e — quando `hasLessons = true` — CTA "Ver curso →"; cards sem aulas ficam `aria-disabled` + `tabIndex=-1` + `pointer-events-none` + badge `Em breve`. Estado vazio: bloco grande com `Sparkles` e título `Em breve` (sem filtro) ou `Sem resultados` com termo entre aspas (com filtro).

### Decisões durante a PR
- **GET form em vez de `useTransition` + Server Action.** Plano original (§5 antiga) previa instant search com `useTransition`. Para um catálogo pequeno e server-rendered, `<form method="get">` é mais simples, acessível sem JS, e cacheável por Vercel. Revisitar se UX exigir filtro instantâneo após termos catálogo > 30 cursos.
- **RLS é fonte única.** O helper não passa `profileId` nem aplica filtro de visibilidade em JS — toda a regra (admin tudo; user `published_at IS NOT NULL` + tags match) vive na policy SQL `course_is_visible(courses)` criada em PR2. Testes unitários verificam que o helper passa a query correcta ao Supabase; o que RLS faz testa-se em PR9 (Playwright contra DB real).
- **Cards sem aulas são desabilitados, não removidos.** Estado intermédio admin (curso criado mas sem aulas ainda) deve continuar visível para dar sinal — o badge `Em breve` substitui o redirect-loop que seria abrir um curso sem aulas. Decisão consistente com SPEC §15 ("manter fluxos simples").
- **Cards 2/3 colunas com gap-5, ícone em quadrado laranja.** Layout consciente da paleta cream + orange definida em `branding.md`. Sem categoria/tab — PR só mostra search; categorias entram em V4+ se ministério pedir.

### Testes (124 → 147)
- 14 em `visibility.test.ts`: empty/error paths, `hasLessons` agregação (modules com/sem lessons, modules null/empty, lessons null), `.ilike` aplicação (skip se vazio/whitespace, trim, limite 80 chars), order asc, select embed correcto.
- 12 em `conteudos/page.test.tsx` (substituindo 3 antigos): heading + intro + search form acessíveis; estado vazio sem filtro (badge "Em breve", sem link Limpar); estado vazio com filtro ("Sem resultados", link Limpar, input pré-populado); cards com link para slug; badge `Em breve` + `aria-disabled` quando `hasLessons = false`; sem badge quando `hasLessons = true`; descrição omitida quando null.

---

## 6. V3 PR6 — Página de curso + página de aula

- `/conteudos/[curso-slug]` — descrição do curso, lista de módulos com lista de aulas, botão "Começar curso" / "Continuar curso" (decisão V3 = primeira aula incompleta) que **regista um access log** (PR8 introduz a tabela; aqui escrevemos via Server Action `logCourseAccessAction`, no-op até PR8 mergear).
- `/conteudos/[curso-slug]/[aula-slug]` — corresponde ao mockup superior esquerdo *sem campo de perguntas*:
  - vídeo embebido YouTube (`<iframe>` com `loading="lazy"`, allow standard).
  - botão "Descarregar PDF" (Server Action devolve URL assinada de 5 min do `lesson-pdfs`).
  - sidebar com lista do módulo activo + restantes módulos colapsáveis.
  - botões "Aula anterior" / "Próxima aula" e (se última aula) "Próximo módulo".
- 12+ testes (visibilidade, render, sidebar, navegação).

---

## 7. V3 PR7 — Conclusão + Curso Concluído

- Botão "Marcar como concluída" na página de aula → `markLessonCompleteAction(lessonId)` → insert idempotente em `lesson_completions`.
- Check ✓ visível na sidebar e na lista de aulas do curso.
- *On-read* (cada visita à página do curso), recalcular: se todas as aulas visíveis estão concluídas e ainda não há `course_completions` para este (user, course), insert. Mostrar ecrã "Curso Concluído" com data.
- "Curso Concluído" preserva data (`SPEC_1.md` §9 V3 + `architecture.md` §6).
- Testes: lesson complete idempotente; course complete inserido apenas na primeira vez; ecrã mostra data correcta.

---

## 8. V3 PR8 — Access logging + admin stats

- Server Action `logCourseAccessAction(courseId)` chamada no clique do "Começar curso" / "Continuar curso".
- Página `/admin/cursos/[id]/stats` (super_admin + admin): contagem distinta de utilizadores que acederam ao curso, contagem de conclusões.
- View SQL `course_stats` (count distinct user_id from access_log + count from completions) com permissões só para admin.
- Testes mínimos.

---

## 9. V3 PR9 — Analytics + E2E

- Vercel Analytics: `@vercel/analytics` instalado, componente `<Analytics />` no `layout.tsx` root. Verificar opt-out em DNT.
- Playwright instalado (`pnpm dlx create-playwright`), config para correr contra preview URL.
- 4-6 testes happy-path:
  1. Login Google (mock ou skip — Google OAuth real não corre em CI, ver se Playwright auth fixture com cookie pré-preparado).
  2. Browse `/conteudos` autenticado.
  3. Abrir um curso visível.
  4. Abrir uma aula, simular play do iframe (não verificar conteúdo do YouTube), descarregar PDF.
  5. Marcar aula como concluída.
  6. Concluir todas as aulas → ver ecrã Curso Concluído.
- `.github/workflows/ci.yml` ganha job `e2e` paralelo a `quality`.

---

## 10. Decisões fechadas (18-05-2026)

- [x] **Branch base:** `v2.5-copy-ux`. Quando V2.5 mergear em `main`, rebase do `v3-cursos` em `main`.
- [x] **Catálogo:** apenas pesquisa textual em V3. Sem categorias. Categorias só entram em V4+ se o ministério pedir.
- [x] **PDF storage:** bucket `lesson-pdfs` privado, descarregar via URL assinado de curta duração (5 min) gerado por Server Action.
- [x] **Língua dos nomes de tabela:** **EN** (`courses`, `modules`, `lessons`, `tags`, `user_tags`, `lesson_completions`, `course_completions`, `course_access_log`). UI continua 100% PT-PT.
- [x] **Reordenar módulos no admin:** setas ↑↓ (botões simples). Drag&drop adiado para V4+ se a UX exigir.
- [x] **Template da aula é mutável (19-05-2026):** admin pode trocar `pdf` ↔ `video_pdf` após criar. `pdf → video_pdf` exige `youtube_url` no mesmo submit. `video_pdf → pdf` limpa o `youtube_url`. PDF mantém-se em ambos. Coerente com SPEC_1.md §15 ("Manter os fluxos de admin simples"). Validado em PR4b.
- [x] **PR4 dividida em PR4a (módulos) + PR4b (aulas) (19-05-2026):** cada uma ship-able sozinha, com preview Vercel testável em mobile antes de avançar. Não introduz âmbito novo — só reduz risco de PR gigante.

---

## 11. Critérios de pronto (V3 inteiro)

- [ ] PRs 1-7 mergeadas em `v3-cursos`, branch limpa.
- [ ] `pnpm test`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm format:check` todos verdes.
- [ ] Migrations aplicadas em `logos-dev` e `logos-prod`.
- [ ] Bucket `lesson-pdfs` criado em `logos-prod`.
- [ ] E2E Playwright happy-path verdes em preview.
- [ ] Smoke test manual: utilizador novo abre conta → vê apenas cursos públicos → super_admin atribui etiqueta `mentoria-cclx` → utilizador vê curso restrito → conclui aulas → vê ecrã Curso Concluído.
- [ ] `changelog.md`, `status.md`, `architecture.md` atualizados.
- [ ] Rebase de `v3-cursos` em cima de `main` actualizado; PR aberta para `main`.

---

## 12. Riscos identificados

- **Prazo apertado:** 6 PRs *gate* em ~6 semanas. Estado em 19-05-2026: PR1+PR2 fechadas no mesmo dia, 5 *gates* restantes em ~6 semanas. Folga confortável para PR3-PR7 + polish PR8-PR9.
- **Google OAuth em CI:** Playwright contra OAuth real não é viável. Usar uma das: (a) cookie de sessão pré-preparado fixado por um script de setup; (b) flag `E2E_AUTH_BYPASS` que injecta `getCurrentUser()` mock só em ambientes E2E. Decidir antes de PR9.
- **Visibilidade RLS recursiva:** ~~já se viu em V2 PR2 (3 fixes)~~. **Mitigado em PR2** via helper `course_is_visible(courses)` STABLE + SECURITY DEFINER reutilizado em modules/lessons. Padrão a manter: nunca subqueries directas a `profiles` em policies; usar sempre os helpers `current_profile_*`.
- **PDF storage:** plano free Supabase tem ~1 GB. 50 aulas × 5 MB = 250 MB. Limite de bucket fixado em **20 MB por PDF** em PR2; se ministério pedir maior, ajustar `file_size_limit` do `storage.buckets`. Aceitável V3; reavaliar V5.
