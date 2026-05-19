# V3 — Plataforma de Cursos (plano)

> **Branch:** `v3-cursos` (base: `v2.5-copy-ux`, próxima base: `main` quando V2.5 mergear).
> **Prazo absoluto:** 01-07-2026 (ver `SPEC_1.md` §1, §9).
> **Fonte:** `SPEC_1.md` §9 (V3), `architecture.md` §2 (modelo de dados), §5 (visibilidade), §6 (conclusão), §7 (storage).
> **Estado:** PR1 + PR2 concluídas em 19-05-2026 (commits `3afb750`, `502f139`). 7 PRs restantes. Aplicado apenas a `logos-dev`; `logos-prod` continua schema V2 conforme `feature-docs/branch-strategy.md`.

## 0. Resumo

V3 entrega o **conteúdo** do LOGOS: Cursos → Módulos → Aulas com vídeo YouTube embebido e apostila em PDF, restrição de acesso por etiqueta (apenas a nível de curso em V3; módulo/aula em V4), conclusão binária por aula, ecrã "Curso Concluído" e contabilização leve de acessos.

V2 PR4 (etiquetas, fundação) ainda não foi construída — fica absorvida em V3 PR1 porque V3 depende dela.

Trabalhamos em 9 PRs pequenas e sequenciais, cada uma ship-able sozinha (testes verdes, CI verde, preview Vercel funcional). A ordem é deliberada: cada PR é um pré-requisito da seguinte.

| # | PR | Tema | Estado | Bloqueia |
|---|---|---|---|---|
| 1 | V3 PR1 | Etiquetas (DB + admin CRUD + assign a utilizadores) | ✅ 19-05-2026 | tudo o resto |
| 2 | V3 PR2 | Schema cursos/módulos/aulas + Storage `lesson-pdfs` + RLS | ✅ 19-05-2026 | PR3-7 |
| 3 | V3 PR3 | Admin: CRUD de Cursos (com `required_tags`) | ⏳ próximo | PR4 |
| 4 | V3 PR4 | Admin: CRUD de Módulos + Aulas (PDF upload, YouTube URL) | ⏳ | PR5 |
| 5 | V3 PR5 | Catálogo público em `/conteudos` (substitui o "Em breve") | ⏳ | PR6 |
| 6 | V3 PR6 | Página de curso + página de aula (YouTube + PDF + nav) | ⏳ | PR7 |
| 7 | V3 PR7 | Conclusão binária + ecrã "Curso Concluído" | ⏳ | PR8 |
| 8 | V3 PR8 | `course_access_log` + stats admin básicas | ⏳ *(polish)* | — |
| 9 | V3 PR9 | Vercel Analytics + Playwright E2E (happy-path) | ⏳ *(polish)* | — |

PRs 1-7 são *gates* para o prazo: sem elas, V3 não existe. PRs 8-9 são *polish*: se o prazo apertar, V3 abre com PR7 funcional e PR8-9 caem para V3.1.

---

## 1. V3 PR1 — Etiquetas (fundação) ✅ 19-05-2026

**Concluída em** commit `3afb750`. Migration `20260518120000_tags_and_user_tags.sql` em `logos-dev`. Absorveu o trabalho de `feature-docs/v2-auth.md` §4 (V2 PR4).

### Entregue
- DB: `tags` (slug unique CHECK 2-64 kebab-case, label 1-80, created_by → profiles restrict), `user_tags` (PK composta, assigned_by, cascade em user_id/tag_id), helper `current_profile_has_tag(uuid[])` STABLE + SECURITY DEFINER (usado em PR2).
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

## 3. V3 PR3 — Admin CRUD de Cursos

- `/admin/cursos` listagem com botão "Novo curso".
- `/admin/cursos/[id]` create/edit form: title, slug (auto + editável), description (markdown simples? não — texto puro V3), icon (lucide icon name ou file upload? V3 = texto livre que mapeia para Lucide; UI manual sem ícones em V4 se necessário), `required_tags` (multi-select alimentado por `tags`), `published_at` (toggle "Publicar"/"Despublicar").
- Server Actions com Zod validation.
- Delete = soft delete (`deleted_at` coluna) **ou** hard delete com confirmação? Decisão: hard delete (V3 não tem auditoria); admin avisado com `<AlertDialog>`.
- 6-10 testes (action defesas, redirect quando user/admin sem permissão).

---

## 4. V3 PR4 — Admin CRUD de Módulos + Aulas

- `/admin/cursos/[id]` ganha tab/secção "Módulos" — listagem ordenada por `position` com botões "Adicionar módulo" + reordenar (drag&drop adiado, V3 usa setas ↑↓).
- `/admin/cursos/[id]/modulos/[moduleId]/aulas` — listagem de aulas + create.
- Aula form: title, template selector, YouTube URL (validado: regex `youtu.be/…|youtube.com/watch?v=…`), PDF upload (multipart Server Action via FormData; sobe para `lesson-pdfs/<courseId>/<lessonId>.pdf`).
- Server Action `uploadLessonPdfAction` separada para isolar lógica de Storage.
- 8-12 testes.

### Pendente do utilizador antes desta PR
- Confirmar se queremos drag&drop ou setas ↑↓ (V3 default = setas).
- Confirmar se admin pode mudar template após criar a aula (V3 default = sim, mas se passar `pdf` → `video_pdf` exige novo upload).

---

## 5. V3 PR5 — Catálogo público

- `/conteudos` deixa de ser placeholder "Em breve" e passa a renderizar cursos via `getVisibleCoursesForUser(profileId)` (server component).
- Cards de curso (icon Lucide + título + descrição curta + tag "em breve" se sem aulas publicadas).
- Estado vazio: mostrar o mesmo "Em breve" actual se não há cursos visíveis para o user.
- Pesquisa: input com `useTransition` + Server Action que aceita query string, filtra por `title ILIKE '%query%'`.
- Não há "categoria" em V3 — apenas pesquisa textual.
- Helper canónico `src/lib/courses/visibility.ts` com `getVisibleCoursesForUser()`. Testes unitários cobrem: sem etiquetas (público), com etiquetas (utilizador sem → invisível, com 1 match → visível).

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
