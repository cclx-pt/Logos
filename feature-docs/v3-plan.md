# V3 — Plataforma de Cursos (plano)

> **Branch:** `v3-cursos` (base: `v2.5-copy-ux`, próxima base: `main` quando V2.5 mergear).
> **Prazo absoluto:** 01-07-2026 (ver `SPEC_1.md` §1, §9).
> **Fonte:** `SPEC_1.md` §9 (V3), `architecture.md` §2 (modelo de dados), §5 (visibilidade), §6 (conclusão), §7 (storage).
> **Estado:** plano fechado em 18-05-2026; nenhuma PR começada.

## 0. Resumo

V3 entrega o **conteúdo** do LOGOS: Cursos → Módulos → Aulas com vídeo YouTube embebido e apostila em PDF, restrição de acesso por etiqueta (apenas a nível de curso em V3; módulo/aula em V4), conclusão binária por aula, ecrã "Curso Concluído" e contabilização leve de acessos.

V2 PR4 (etiquetas, fundação) ainda não foi construída — fica absorvida em V3 PR1 porque V3 depende dela.

Trabalhamos em 9 PRs pequenas e sequenciais, cada uma ship-able sozinha (testes verdes, CI verde, preview Vercel funcional). A ordem é deliberada: cada PR é um pré-requisito da seguinte.

| # | PR | Tema | Bloqueia |
|---|---|---|---|
| 1 | V3 PR1 | Etiquetas (DB + admin CRUD + assign a utilizadores) | tudo o resto |
| 2 | V3 PR2 | Schema cursos/módulos/aulas + Storage `lesson-pdfs` + RLS | PR3-7 |
| 3 | V3 PR3 | Admin: CRUD de Cursos (com `required_tags`) | PR4 |
| 4 | V3 PR4 | Admin: CRUD de Módulos + Aulas (PDF upload, YouTube URL) | PR5 |
| 5 | V3 PR5 | Catálogo público em `/conteudos` (substitui o "Em breve") | PR6 |
| 6 | V3 PR6 | Página de curso + página de aula (YouTube + PDF + nav) | PR7 |
| 7 | V3 PR7 | Conclusão binária + ecrã "Curso Concluído" | PR8 |
| 8 | V3 PR8 | `course_access_log` + stats admin básicas | — |
| 9 | V3 PR9 | Vercel Analytics + Playwright E2E (happy-path) | — |

PRs 1-7 são *gates* para o prazo: sem elas, V3 não existe. PRs 8-9 são *polish*: se o prazo apertar, V3 abre com PR7 funcional e PR8-9 caem para V3.1.

---

## 1. V3 PR1 — Etiquetas (fundação)

**Antes:** absorve o trabalho descrito em `feature-docs/v2-auth.md` §4 (V2 PR4).

### DB
- Migration `tags` (id uuid, slug unique, label text, created_by FK profiles, created_at).
- Migration `user_tags` (user_id FK profiles, tag_id FK tags, assigned_by FK profiles, assigned_at, PK composta).
- RLS: super_admin + admin lêem tudo; user lê apenas as suas próprias (`current_profile_id()`); só super_admin escreve em `tags`; super_admin + admin escrevem em `user_tags`.

### UI admin
- `/admin/etiquetas` — listagem + create/edit/delete (slug auto-gerado, editável).
- `/admin/utilizadores/[id]/etiquetas` ou painel inline em `/admin/utilizadores` — atribuir/remover etiquetas a um utilizador.

### Testes
- Server Actions cobertas (create/update/delete/assign/unassign + defesas de papel).
- Layout gating (`/admin/etiquetas` redirect/notFound para user).

### Não-âmbito
- Atribuir etiquetas a cursos — esse passo entra na V3 PR3.
- Etiquetas a nível de módulo/aula — V4.

---

## 2. V3 PR2 — Schema base + storage

### DB
- Migration `courses` (id uuid, slug unique, title, description, icon nullable, required_tags uuid[] default '{}', created_at, updated_at, published_at nullable).
- Migration `modules` (id uuid, course_id FK courses ON DELETE CASCADE, position int, title, description nullable, created_at, updated_at).
- Migration `lessons` (id uuid, module_id FK modules ON DELETE CASCADE, position int, title, description nullable, template text CHECK in ('pdf','video_pdf'), youtube_url nullable, pdf_storage_path nullable, created_at, updated_at).
- Migration `lesson_completions` (user_id FK profiles, lesson_id FK lessons, completed_at, PK composta).
- Migration `course_completions` (user_id, course_id, completed_at, PK composta).
- Migration `course_access_log` (user_id, course_id, accessed_at — sem unique para permitir múltiplos acessos).

### RLS
- `courses` SELECT: visível se `published_at IS NOT NULL AND (required_tags = '{}' OR user_has_overlap_tag())`. Helper SQL `current_profile_has_tag(uuid[])` STABLE.
- `modules`/`lessons` SELECT: derivar do curso (`exists(select 1 from courses c where c.id = course_id and …)`).
- `lesson_completions`/`course_completions` SELECT/INSERT: utilizador só lê e escreve as suas próprias.
- Admin/super_admin têm SELECT/INSERT/UPDATE/DELETE em tudo.

### Storage
- Bucket `lesson-pdfs` privado.
- Policy: admin/super_admin escreve; utilizador autenticado lê via URL assinado por Server Action.

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

## 10. Pendentes do utilizador antes de começar PR1

- [ ] Confirmar branch base: `v2.5-copy-ux` (decidido 18-05-2026). Quando V2.5 mergear em `main`, rebase do `v3-cursos` em `main`.
- [ ] Decidir se o catálogo V3 deve ter, além da pesquisa textual, **categorias** simples (V3 default = não; apenas pesquisa).
- [ ] Confirmar a abordagem PDF: armazenado em `lesson-pdfs` privado, com URL assinado de curta duração (5 min). Não há cache, descarregar sempre via Server Action.
- [ ] Decidir título canónico das tabelas em PT vs EN. Decisão V3 default = **EN** (`courses`, `modules`, `lessons`) para consistência com tools (Drizzle, Prisma futuras); colunas em EN; UI em PT.

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

- **Prazo apertado:** 6 PRs *gate* em ~6 semanas. Mitigação: PR1 (etiquetas) já está scoped em `v2-auth.md` §4, pode arrancar imediatamente. PR2 (schema) é puro SQL, alto valor / baixo risco.
- **Google OAuth em CI:** Playwright contra OAuth real não é viável. Usar uma das: (a) cookie de sessão pré-preparado fixado por um script de setup; (b) flag `E2E_AUTH_BYPASS` que injecta `getCurrentUser()` mock só em ambientes E2E. Decidir antes de PR9.
- **Visibilidade RLS recursiva:** já se viu em V2 PR2 (3 fixes). Cuidado em `modules`/`lessons` SELECT — usar função helper `current_profile_id()` + `current_profile_has_tag()`, nunca subqueries directas a `profiles`.
- **PDF storage:** plano free Supabase tem ~1 GB. 50 aulas × 5 MB = 250 MB. Aceitável V3; reavaliar V5.
