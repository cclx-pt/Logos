# V3.3 — UX + estrutura + enrollment — HANDOFF

> **Estado:** plano atualizado em 28-05-2026. PR1 e PR2 (admin homogeneidade) **mergeadas**. Resta PR3-PR7.
> **Quando trabalho fechar:** apagar este ficheiro e substituir por `feature-docs/v3-3-iteration.md` (estilo `v3-1-iteration.md` / `v3-2-iteration.md`).

---

## Decisões já tomadas (não voltar a perguntar)

| Decisão | Escolha |
|---|---|
| **Layout do CourseCard split** | Imagem **esquerda**, texto direita (desktop). Empilhado mobile (imagem em cima). |
| **Heading estado vazio /meus-cursos** | *"Inicia sessão para ver os teus cursos"* (assumida transcrição imperfeita de "Iniciação"). |
| **Modelo de enrollment** | **Reusar `course_access_log`**. Primeira row = enrolled. Adicionar coluna `unenrolled_at` na row mais recente (ou tabela auxiliar mínima) para permitir "sair do curso". Decisão fina (coluna vs tabela) na altura da PR7. |
| **Pré-requisitos sequenciais (aulas/módulos/cursos)** | **Adiados para V4** (depois de 01-07-2026). Fora do âmbito de V3.3. |
| **Numeração `1.x.y` na admin** | Aplicada em CourseTree + LessonList. PR2 mergeada. |
| **RLS pública para anónimos** | A confirmar **na altura da PR7**. Direcção: relaxar SELECT de `courses` para `published_at IS NOT NULL AND required_tags = '{}'`. Não expõe nada novo — só permite ver sem login. |
| **Pesquisa em listas admin (PR5)** | Client-side filter sobre Server-rendered list, search input no topo de cada listagem (utilizadores, cursos, tags). Threshold para virar server-side fica para V4. |
| **Smoothness (PR6)** | Framer Motion **não** é introduzido. Usar transições CSS nativas + `<details>` HTML5 + `View Transitions API` quando possível. Mantém bundle leve. |

---

## Pedidos do utilizador (verbatim, organizados)

### /meus-cursos (PR3)
- Remover ícone do estado vazio (BookMarked).
- Heading: *"Inicia sessão para ver os teus cursos"*.
- Subtexto autenticado vazio: *"Aqui ficam guardados os cursos que começaste, ordenados pelo mais recente."*
- Subtexto anónimo: *"Aqui ficam guardados os cursos que já começaste. Inicia com a tua conta Google para começar."*

### /conteudos/<id> — três estados (PR7)
| Quem | O que vê | O que pode fazer |
|---|---|---|
| Anónimo | Banner + título + descrição. **NÃO** vê módulos nem aulas, nem contagens. Mensagem CTA: *"Inicia sessão para aceder ao conteúdo deste curso e a mais cursos."* | Iniciar sessão Google |
| Logado, **não inscrito** | + lista completa de módulos e aulas (estrutura visível) mas **aulas não clicáveis**. Botão grande **"Começar curso"**. | Clicar "Começar" → inscrever-se. Após inscrever, aparece estado de *"Estás inscrito"*. |
| Logado, **inscrito** | + aulas clicáveis (comportamento V3 actual). Botão **"Sair do curso"**. | Aceder a aulas; sair → volta ao estado "não inscrito" sem perder progresso. |

### CourseCard split 50/50 (PR4)
Hoje: card vertical com `[imagem-pequena]` em cima e texto em baixo. Passa a:
- **Desktop:** flex horizontal. Metade esquerda = banner (ou icon de fallback). Metade direita = título + badge + descrição + CTA.
- **Mobile:** empilhado (imagem em cima, texto em baixo) — mas a imagem ocupa altura proporcional a "metade do card", não thumbnail.

### Search em listagens admin (PR5)
Pedido em 28-05-2026: *"queria um dropdown de pesquisa a todos os elementos tipo, utilizador, cursos, tags. Coisas que vão crescer quero já como fallback adicionar pesquisa."*

- **Onde:** topo de cada listagem admin que pode crescer — `/admin/utilizadores`, `/admin/conteudos` (cursos), `/admin/etiquetas`.
- **UX:** input simples de filtro (não dropdown obrigatoriamente — "dropdown" do utilizador interpretado como "controlo de pesquisa que filtra a lista abaixo"). Filtra client-side por título/nome/email/label.
- **Empty state:** quando o filtro não bate em nada, mostrar *"Sem resultados para «xpto»."* + link para limpar.
- **Limites V3:** client-side é OK até ~200 items. Acima disso passa a server-side com query param (V4).
- **Acessibilidade:** `role="search"` + `<label>` invisível.

### Smoothness pass (PR6)
Pedido em 28-05-2026: *"tudo seja mais smooth. abrir janelas dropdown, etc, tudo deve ser fluido e avançar smoothly nada brusco incluindo erros."*

- **CollapsibleSection:** o `<details>` HTML5 abre instantâneo. Adicionar transição CSS de `max-height` ou usar `interpolate-size: allow-keywords` (Tailwind v4 / CSS moderno) para fade+slide suave.
- **Navegação entre páginas:** ativar **View Transitions API** (Next.js 16 `experimental.viewTransition: true`) para fade entre rotas. Especialmente útil ao entrar/sair de modo `?editar=<lessonId>`.
- **Botões + Links:** garantir `transition-colors` em todos os hovers críticos (admin row hover, course card hover). Auditar `cursor-pointer` consistente.
- **Mensagens de erro/sucesso:** hoje aparecem como flash via `?guardado=` / `?erro=`. Adicionar component `Toast` com fade-in/out (3s) em vez de mensagem estática no topo. Server Actions já enviam o param; o toast só lê o searchParam e dispara.
- **Foco visível:** garantir `focus-visible:ring-2` consistente em tudo clicável.
- **Não introduzir** Framer Motion ou Motion-One — peso desnecessário para o que se quer.

### Admin /conteudos (parte ainda por fazer — entra na PR5)
- **Listagem `/admin/conteudos`**: remover coluna "Ações" e botão "Abrir →". Linha inteira passa a ser clicável (`<Link>` ou `<tr>` com `onClick`).
- *Stats* e *numeração 1.x.y* já feitos na PR2.

---

## Ordem das PRs

| # | Foco | Tamanho | Risco | Bloqueia próxima? | Estado |
|---|---|---|---|---|---|
| ~~PR1~~ | Collapsibles fechados + reorder curso | XS | Baixo | Não | ✅ mergeada |
| ~~PR2~~ | Admin homogeneidade (módulo: Detalhes/Aulas/Zona; modo editar aula; stats CollapsibleSection; numeração `1.x`; CourseTree ganha header de curso) | M | Médio | Não | ✅ mergeada |
| **PR3** | Copy /meus-cursos (ícone fora + textos novos) | XS | Baixo | Não | — |
| **PR4** | CourseCard split 50/50 | M | Médio (componente partilhado) | Não | — |
| **PR5** | Search em listagens admin + linhas clicáveis em `/admin/conteudos` | M | Baixo | Não | — |
| **PR6** | Smoothness pass — transitions, toast, view transitions, focus-visible | M | Médio (toca em muitos sítios) | Não | — |
| **PR7** | Enrollment + estado anónimo | L | Alto (schema + RLS + 3 views) | Sim — bloqueia merge final V3.3 | — |

### Critério de avanço
- Todas as PRs ficam em sub-branches a partir de `v3-cursos`.
- Cada PR mergea para `v3-cursos` independentemente, com testes verdes.
- `v3-cursos → main` só depois de PR7 + testemunhos finais do ministério.

---

## Ficheiros prováveis por PR (pista para o próximo Claude)

**PR3 — Copy /meus-cursos**
- `src/app/meus-cursos/meus-cursos-content.tsx` — texto + remover `BookMarked`
- Tests: `meus-cursos-content.test.tsx`

**PR4 — CourseCard split**
- `src/components/site/course-card.tsx` — reorganizar layout flex
- `src/lib/courses/course-image.tsx` — talvez variant nova `card-split`
- Tests: `course-image.test.tsx`, `conteudos/page.test.tsx`, `meus-cursos-content.test.tsx`

**PR5 — Search admin + linhas clicáveis**
- Novo `src/components/admin/list-search.tsx` — input client-side de filtro reutilizável
- `src/app/admin/utilizadores/page.tsx` (+ `users-table.tsx`) — wrapper com filtro por nome/email/role
- `src/app/admin/conteudos/page.tsx` — wrapper com filtro por título + linha clicável + remover coluna "Ações"
- `src/app/admin/etiquetas/page.tsx` (+ `tags-table.tsx`) — wrapper com filtro por label
- Tests: novos em `list-search.test.tsx` + smoke em cada página

**PR6 — Smoothness**
- `next.config.ts` — `experimental.viewTransition: true`
- `src/components/ui/collapsible-section.tsx` — adicionar transição `interpolate-size: allow-keywords` ou JS-managed open
- Novo `src/components/ui/toast.tsx` — Client Component lê searchParams (`guardado` / `erro`) e mostra toast
- `src/app/admin/layout.tsx` (e outros) — adicionar `<Toast />` global
- Audit em todos os `Link`/`button` para `transition-colors` + `focus-visible:ring-2`

**PR7 — Enrollment + anónimo**
- Migration nova em `supabase/migrations/` — `course_access_log` ganha `unenrolled_at` OU nova tabela `enrollments`
- Migration nova — relaxar `courses` RLS para SELECT anónimo (publicados + sem tags)
- `src/lib/courses/enrollment.ts` (novo) — `getEnrollmentState(courseId)`, `enrollAction`, `unenrollAction`
- `src/app/conteudos/[courseId]/page.tsx` — 3 vistas (switch por estado)
- `src/app/conteudos/[courseId]/start-course-cta.tsx` — passa de "Começar" plain para enroll
- Tests: vários novos

---

## O que IGNORAR de pedidos anteriores

- Reorganização da pasta raiz (mover `claude-code-psb-guide.md` etc.) — **adiada indefinidamente**.
- Frase "Pode usar palavras em português" — confirmada como descrição da experiência, não instrução.
- `refactor/redundancies` branch — mergeada em 28-05-2026 (PR #35).
