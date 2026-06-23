# feature-docs/sequencing.md — Pré-requisitos sequenciais (V3.6)

> **Estado:** implementado em `logos-dev` (branch `v3-6-sequencial`, 14-06-2026). Migration **não** aplicada a `logos-prod` (sobe no lançamento V3, igual ao resto de V3.x).
> **Âmbito:** funcionalidade que estava adiada para **V4** em `status.md` (V3.2) e foi **puxada para V3.6** por decisão do líder (14-06-2026), no mesmo padrão de Live, Q&A e estatísticas. `SPEC_1.md` §6/§9/§19 atualizado.

## 1. O que faz

Três controlos **opcionais por curso**, geridos pelo admin no formulário do curso. As duas flags de sequência interna são **independentes**:

1. **Aulas em sequência** (`courses.sequential_lessons`, boolean): dentro de cada módulo, as aulas têm de ser concluídas pela ordem (`lesson.position`). A aula 2 exige a aula 1 do **mesmo** módulo.
2. **Módulos em sequência** (`courses.sequential_modules`, boolean): um módulo só abre depois de o módulo anterior (com aulas) estar **totalmente concluído**. Ortogonal à flag das aulas - dá para exigir ordem só das aulas, só dos módulos, ambas ou nenhuma.
3. **Curso pré-requisito** (`courses.prerequisite_course_id`, auto-FK nullable): o curso só fica disponível depois de o curso apontado estar **concluído**. `NULL` = autónomo. Encadear A → B → C cria uma sequência de cursos.

**Conteúdo bloqueado aparece com cadeado + dica, nunca escondido** (decisão de UX, 14-06-2026). É deliberadamente diferente da restrição por etiqueta (`SPEC_1.md` §5), que é invisível: a sequência é pedagógica (mostra o caminho), a etiqueta é controlo de acesso.

## 2. Modelo de dados

Migration `supabase/migrations/20260614140000_sequential_prerequisites.sql` (**fonte de verdade para `logos-prod`**, sobe no lançamento):

- `courses.sequential_lessons boolean not null default false`
- `courses.sequential_modules boolean not null default false`
- `courses.prerequisite_course_id uuid references courses(id) on delete set null` - `on delete set null` torna o curso autónomo quando o pré-requisito é apagado (nunca cascata).
- CHECK `courses_prerequisite_not_self` - trava a auto-referência directa. Ciclos mais longos (A → B → A) são travados na Server Action.
- Índice parcial `courses_prerequisite_course_id_idx`.

**Nota sobre `logos-dev`:** a primeira versão da feature tinha uma só coluna `sequential`; foi aplicada a `logos-dev` e depois **separada nas duas flags** por um corretivo aplicado via MCP (`split_sequential_into_two_toggles`: `rename sequential → sequential_lessons` + `add sequential_modules`). O ficheiro acima cria já as duas colunas, por isso uma `logos-prod` (ou um dev reconstruído de raiz) fica correcta sem o corretivo.

**Sem mudanças de RLS.** As colunas vivem em `courses`, já coberto pelas policies `courses_select_visible` / `courses_update_admin`.

## 3. Aplicação (server-side, não RLS)

A regra é aplicada na camada da aplicação, tal como a deteção de "curso concluído" (`architecture.md` §6). Não está em RLS porque é dinâmica e por utilizador, e metê-la em policies exigiria juntar `lesson_completions`/`course_completions` em cada SELECT sem ganho de segurança.

### Lógica pura — `src/lib/courses/sequencing.ts`

- `getSequentialAccess(course, completed)` → `{ lockedLessonIds, lockedModuleIds }`, combinando as duas flags:
  - **`sequential_modules`**: um módulo (com aulas) fica em `lockedModuleIds` se algum módulo **anterior com aulas** não estiver totalmente concluído. Um módulo bloqueado tranca **todas** as suas aulas. Módulos vazios não contam.
  - **`sequential_lessons`**: dentro de um módulo **não trancado**, uma aula fica bloqueada se existir aula anterior **do mesmo módulo** por concluir (cada módulo tem a sua própria "fronteira").
  - Aulas já concluídas nunca bloqueiam (permite rever, mesmo concluídas fora de ordem).
- `getFrontierLesson(course, completed)` → a próxima aula a fazer (destino dos redirects).
- `findModuleOfLesson(course, lessonId)` → o módulo que contém a aula (destino do redirect de módulo).

Testes: `src/lib/courses/sequencing.test.ts`.

### Pontos de gating

| Superfície | Comportamento |
|---|---|
| Página de aula (`/conteudos/[courseId]/[lessonId]`) | aula bloqueada → `redirect` para a aula-fronteira; grava `course_completions` on-read se o curso ficou completo. **A navegação inferior "Próxima aula" respeita o cadeado** (fix 22-06-2026): quando a próxima está bloqueada mostra um cartão com cadeado + "Marca esta aula como concluída para a desbloquear" em vez de um link que saltava silenciosamente de volta para a fronteira |
| Página de módulo (`/conteudos/[courseId]/modulos/[moduleId]`) | módulo bloqueado → `redirect` para o módulo da fronteira; aulas bloqueadas na lista ficam não-clicáveis + cadeado |
| Landing do curso (`/conteudos/[courseId]`) | módulos bloqueados não-clicáveis + dica; se o pré-requisito faltar, o CTA de inscrição dá lugar a aviso com link ao pré-requisito |
| `LessonTree` (árvore da vista de aula) | aulas bloqueadas não-clicáveis + cadeado |
| Catálogo (`CourseCard`) | card bloqueado por pré-requisito: cinzento, não-clicável, "Conclui [Curso A] primeiro" |
| `enrollAction` (`src/lib/courses/enrollment.ts`) | recusa a inscrição se o pré-requisito não estiver concluído (defesa em profundidade) |

### Pré-requisito de curso ↔ `course_completions`

O gate de pré-requisito lê `course_completions` (o registo de "curso concluído"). Como esse registo nascia apenas ao renderizar a página do curso já completa, a **página de aula passa a gravá-lo on-read** (`getOrCreateCourseCompletion`) assim que `isCourseComplete` é verdade - fecha o caso de o aluno concluir a última aula e nunca mais voltar à página do curso.

## 4. Admin

- `course-form.tsx`: checkboxes **"Aulas em sequência"** + **"Módulos em sequência"** + select **"Curso pré-requisito"** (`courseOptions`; no modo `edit` já vem sem o próprio curso).
- `courses-actions.ts`: parse de `sequential_lessons`/`sequential_modules`; `validatePrerequisite` (`''`/ausente → `null`; caso contrário UUID válido, **não auto-referência**, **curso existe**, e **sem ciclos** - percorre a cadeia `candidato → pré-requisito do candidato → ...` até `PREREQUISITE_MAX_DEPTH`; se voltar ao próprio curso, recusa). Incluído no insert/update.
- Páginas `novo/page.tsx` e `[courseId]/page.tsx` carregam a lista de cursos para o select.

## 5. Decisões e limites conhecidos

- **Sem bypass para admin.** As páginas de aula/módulo já exigem inscrição (gate de V3.3 PR8) e tratam o admin como aluno; a sequência aplica-se da mesma forma. Para gerir/preview do conteúdo o admin usa `/admin/conteudos` (árvore completa, sem gating) ou desliga temporariamente as flags de sequência. Reabrir se atrapalhar a QA.
- **Quem já estava inscrito não é bloqueado retroactivamente** por um pré-requisito adicionado depois - o gate de pré-requisito é só no momento da inscrição.
- **Pré-requisito invisível ao utilizador** (draft/restrito por etiqueta) não bloqueia: o lookup do título respeita a RLS e devolve `null`, logo o card/landing não mostram bloqueio (não se bloqueia por algo que o utilizador não vê).

## 6. Ficheiros tocados

- **DB:** `supabase/migrations/20260614140000_sequential_prerequisites.sql`
- **Lógica/tipos:** `src/lib/courses/sequencing.ts` (+ teste), `detail.ts` (`CourseDetail.sequentialLessons`/`.sequentialModules` + `.prerequisite`), `visibility.ts` (`VisibleCourse.prerequisite` + lookup em lote), `started.ts` (`prerequisite: null`)
- **Admin:** `course-form.tsx`, `courses-actions.ts`, `novo/page.tsx`, `[courseId]/page.tsx`
- **Público:** `[courseId]/page.tsx`, `[courseId]/[lessonId]/page.tsx`, `[courseId]/[lessonId]/lesson-tree.tsx`, `[courseId]/modulos/[moduleId]/page.tsx`, `conteudos-content.tsx`, `components/site/course-card.tsx`, `enrollment.ts`
- **Testes:** `sequencing.test.ts` (novo), `courses-actions.test.ts`, `enrollment.test.ts`, `detail.test.ts`, `visibility.test.ts`, e fixtures (`completion.test.ts`, `sort.test.ts`, `started.test.ts`, `page.test.tsx`, `meus-cursos-content.test.tsx`)

654 testes verdes; lint + typecheck limpos.
