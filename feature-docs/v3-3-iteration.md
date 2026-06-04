# V3.3 — UX + estrutura + enrollment

> **Status:** fechada em `v3-cursos` (todas as PRs mergeadas). Nada mergea em `main` até ao lançamento (01-07-2026). Substitui o antigo `v3-3-handoff.md` (apagado).

## Contexto

V3.2 fechada do lado do código. Esta iteração arruma a homogeneidade da admin, limpa o catálogo, dá um passe de fluidez à UI e, sobretudo, introduz **enrollment explícito** com landing pública anónima — o bloqueador final antes do merge V3.3.

Pré-requisitos sequenciais (aulas/módulos/cursos) que tinham sido esboçados no planeamento de V3.2 foram **adiados para V4** (depois de 01-07-2026) e ficam fora do âmbito desta iteração.

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Layout do CourseCard | **Vertical** (banner em cima, texto em baixo) em todos os tamanhos. Split 50/50 foi implementado (PR #39) e **rejeitado após teste** - sentiu-se comprimido. Catálogo descarta descrição; `/meus-cursos` mantém. |
| Descrição no catálogo | **Sai do catálogo** - vive só na landing do curso. Catálogo respira; títulos longos cabem. |
| Largura de `/conteudos` | **Full-width em desktop** (`w-full px-4 lg:px-12 xl:px-16`, `xl:grid-cols-4`). `/meus-cursos` continua centrado (`max-w-5xl`). |
| Modelo de enrollment | **Reusar `course_access_log`**. Coluna `unenrolled_at` na row mais recente (NULL = inscrição activa). Sem tabela nova. |
| RLS anónima | Relaxar SELECT de `courses` para anon **só** em `published_at IS NOT NULL AND required_tags = '{}'`. Módulos/aulas continuam authenticated-only. |
| Pesquisa em listas admin | **Client-side filter** sobre lista server-rendered, confortável até ~200 items. Acima disso, server-side com `?q=` (V4). |
| Smoothness | **Sem Framer Motion.** Transições CSS nativas + `<details>` HTML5 + View Transitions API. |

## Plano de PRs (todas mergeadas)

### PR1 — Collapsibles fechados + reorder admin/curso (#36)
Collapsibles default-fechados nas páginas densas + reordenação na árvore do curso.

### PR2 — Admin homogeneidade (#37)
Página de módulo com secções Detalhes/Aulas/Zona de perigo; modo editar aula; stats em `CollapsibleSection`; numeração `1.x.y` em CourseTree + LessonList; CourseTree ganha header de curso.

### PR3 — Copy /meus-cursos (#38)
- Estado anónimo: remove ícone `BookMarked`; subtexto *"Aqui ficam guardados os cursos que já começaste. Inicia com a tua conta Google para começar."*
- Estado autenticado vazio: remove ícone; subtexto *"Aqui ficam guardados os cursos que começaste, ordenados pelo mais recente."*
- `src/app/meus-cursos/meus-cursos-content.tsx` + testes.

### PR4 — CourseCard split 50/50 — DESCARTADA (#39 closed)
Implementada e rejeitada após teste. Revertida pela PR5.

### PR5 — Catálogo full-width + módulos como páginas (#40)
- **Catálogo `/conteudos`:** full-width desktop, `xl:grid-cols-4`, imagem do card edge-to-edge (`aspect-square w-full`, card `overflow-hidden`), sem descrição.
- **Página do curso:** módulos passam de `<details>` a **link cards** (clicar navega para a página do módulo); mantêm contagem `N/M`, check e seta `→` que desliza no hover.
- **Nova rota** `/conteudos/[courseId]/modulos/[moduleId]`: breadcrumb 3 níveis, header `Módulo N de M`, lista de aulas com estado, CTA "Próximo módulo →", "← Voltar ao curso".
- **Página da aula:** breadcrumb ganha link para o módulo; "Próximo módulo →" aponta para a página do módulo seguinte.
- `/meus-cursos` intocado (centrado, com descrição).

### PR6 — Search admin + linhas clicáveis (#41)
- **`<ListSearch>`** (`src/components/admin/list-search.tsx`) - wrapper Client; esconde via DOM (`hidden`) os descendentes com `data-search-text` que não batem; empty-state quando query activa e zero matches; `role="search"` + label invisível.
- **`<ClickableRow>`** (`src/components/admin/clickable-row.tsx`) - `<tr>` com `onClick` → `href`; ignora cliques em `<a>/<button>/<input>/<textarea>/<select>/<label>`.
- Aplicação: `/admin/conteudos` (pesquisa por título + linha clicável + coluna "Ações"/"Abrir →" removida), `/admin/utilizadores` (nome/papel/etiqueta), `/admin/etiquetas` (label).
- Linhas em modo `?editar=` / `?apagar=` ignoram o filtro (layout próprio).
- 6 testes novos em `list-search.test.tsx`.

### PR7 — Smoothness pass (#42)
- **View Transitions API:** `experimental.viewTransition: true` em `next.config.ts` - crossfade automático entre rotas (Next 16 + React 19); fallback instantâneo em browsers sem suporte.
- **Abertura suave de `<details>`:** `interpolate-size: allow-keywords` no `:root` + transição `details::details-content` (250 ms ease-out); fallback `prefers-reduced-motion`.
- **Baseline de transições:** `a, button, summary, [role='button']` ganham `transition` de cor/bg/border/opacity (150 ms ease-out) em `globals.css`.
- **Polish:** remove ícone `Sparkles` do estado vazio "Não tens cursos em progresso" em `/meus-cursos`.
- Sem dependências npm novas.

### PR8 — Enrollment + estado anónimo (#43) — bloqueador final
**Migration (aplicada em `logos-dev`):**
- `course_access_log.unenrolled_at timestamptz null` - NULL = inscrição activa.
- Índice composto `(user_id, course_id, accessed_at desc)` para `getEnrollmentState`.
- Policy UPDATE `course_access_log_update_own`.
- `course_is_visible(courses)` passa a aceitar `anon` (só `published_at IS NOT NULL AND required_tags = '{}'`).
- `modules_select_visible` / `lessons_select_visible` ganham `auth.role() = 'authenticated'` explícito - anon vê o curso mas nunca a estrutura.

**Lib** `src/lib/courses/enrollment.ts`: `getEnrollmentState`, `enrollAction`, `unenrollAction` (com `revalidatePath` em `/conteudos/<id>` + `/meus-cursos`). `getStartedCoursesForUser` exclui cursos cuja row mais recente tem `unenrolled_at` set.

**Três vistas em `/conteudos/[courseId]`:**
| Quem | Vê | Pode |
|---|---|---|
| Anónimo | banner + título + descrição + CTA "Inicia sessão com Google" | iniciar sessão |
| Logado, não inscrito | + estrutura completa read-only (numerada `1.1, 1.2…`, sem links) + "Começar curso →" | inscrever-se |
| Logado, inscrito | módulos como link cards, aulas clicáveis + "Sair do curso" | aceder; sair sem perder progresso |

Rotas de aula/módulo redireccionam para a landing se `enrollmentState !== 'enrolled'` (defesa em profundidade ao RLS). `course_completions` preservado após unenroll. PDF signing continua único em `getLessonPdfSignedUrlAction`.

14 testes novos em `enrollment.test.ts` + 2 em `started.test.ts`. Suite final: 369/369 verdes.

## Estado de saída

- V3.3 fechada do lado do código + DB (migrations em `logos-dev`).
- Bloqueador residual ao merge `v3-cursos → main`: testemunhos finais do ministério + smoke test manual no preview. Detalhes em `status.md`.
