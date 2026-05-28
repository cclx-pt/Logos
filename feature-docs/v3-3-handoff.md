# V3.3 — UX + estrutura + enrollment — HANDOFF

> **Estado:** plano fechado em 28-05-2026. Nenhuma PR aberta ainda. Decisões críticas tomadas.
> **Sessão seguinte:** começar pela PR1 (collapsibles fechados). Não há código WIP.
> **Quando trabalho fechar:** apagar este ficheiro e substituir por `feature-docs/v3-3-iteration.md` (estilo `v3-1-iteration.md` / `v3-2-iteration.md`).

---

## Branch refactor pendente (independente desta iteração)

`refactor/redundancies` está **pushed** em https://github.com/cclx-pt/Logos/tree/refactor/redundancies (7 commits, 28 ficheiros, 311+/320-, 345/345 testes verdes). Falta abrir PR.

Conteúdo: UUID_RE, ROLE_LABEL, formatDate, validators admin, isAdmin/isSuperAdmin, checks role migrados, CourseCard partilhado. Ver `git log --oneline v3-cursos..refactor/redundancies`.

`format:check` reporta 6 ficheiros de config (`.prettierrc.json`, `pnpm-workspace.yaml`, `postcss.config.mjs`, `src/app/fonts.ts`, `tsconfig.json`, `vitest.config.ts`) — **não tocados pelo refactor**, vieram do pull anterior. Resolver à parte com `pnpm format`.

---

## Decisões já tomadas (não voltar a perguntar)

| Decisão | Escolha |
|---|---|
| **Layout do CourseCard split** | Imagem **esquerda**, texto direita (desktop). Empilhado mobile (imagem em cima). |
| **Heading estado vazio /meus-cursos** | *"Inicia sessão para ver os teus cursos"* (assumida transcrição imperfeita de "Iniciação"). |
| **Modelo de enrollment** | **Reusar `course_access_log`**. Primeira row = enrolled. Adicionar coluna `unenrolled_at` na row mais recente (ou tabela auxiliar mínima) para permitir "sair do curso". Decisão fina (coluna vs tabela) na altura da PR5. |
| **Pré-requisitos sequenciais (aulas/módulos/cursos)** | **Adiados para V4** (depois de 01-07-2026). Fora do âmbito de V3.3. |
| **Numeração `1.x.y` na admin** | Só admin (CourseTree + listagens). Não no catálogo público. |
| **RLS pública para anónimos** | A confirmar **na altura da PR5**. Direcção: relaxar SELECT de `courses` para `published_at IS NOT NULL AND required_tags = '{}'`. Não expõe nada novo — só permite ver sem login. |

---

## Pedidos do utilizador (verbatim, organizados)

### /meus-cursos
- Remover ícone do estado vazio (BookMarked).
- Heading: *"Inicia sessão para ver os teus cursos"*.
- Subtexto autenticado vazio: *"Aqui ficam guardados os cursos que começaste, ordenados pelo mais recente."*
- Subtexto anónimo: *"Aqui ficam guardados os cursos que já começaste. Inicia com a tua conta Google para começar."*

### /conteudos/<id> — três estados
| Quem | O que vê | O que pode fazer |
|---|---|---|
| Anónimo | Banner + título + descrição. **NÃO** vê módulos nem aulas, nem contagens. Mensagem CTA: *"Inicia sessão para aceder ao conteúdo deste curso e a mais cursos."* | Iniciar sessão Google |
| Logado, **não inscrito** | + lista completa de módulos e aulas (estrutura visível) mas **aulas não clicáveis**. Botão grande **"Começar curso"**. | Clicar "Começar" → inscrever-se. Após inscrever, aparece estado de *"Estás inscrito"*. |
| Logado, **inscrito** | + aulas clicáveis (comportamento V3 actual). Botão **"Sair do curso"**. | Aceder a aulas; sair → volta ao estado "não inscrito" sem perder progresso. |

> **Nota do user:** "Pode usar palavras em português" = conteúdo das aulas em PT-PT (já é). Não é instrução de design — é descrição.

### CourseCard (catálogo + /meus-cursos) — split 50/50
Hoje: card vertical com `[imagem-pequena]` em cima e texto em baixo. Passa a:
- **Desktop:** flex horizontal. Metade esquerda = banner (ou icon de fallback). Metade direita = título + badge + descrição + CTA.
- **Mobile:** empilhado (imagem em cima, texto em baixo) — mas a imagem ocupa altura proporcional a "metade do card", não thumbnail.

### Admin /conteudos
- **Listagem**: remover coluna "Ações" e botão "Abrir →". Linha inteira passa a ser clicável (`<Link>` ou `<tr>` com `onClick`).
- **Stats**: hoje há seta "↗" ao lado do número. Passa a ser **CollapsibleSection** ao mesmo nível de "Detalhes" e "Módulos".
- **Numeração hierárquica**: `1.`, `1.1`, `1.1.1` (curso/módulo/aula) na CourseTree e listagens admin. Derivada de `position` (1-indexed).

### Pop-ups / CollapsibleSections — defaults fechados e consistentes
Cada nível tem exactamente a mesma forma:

| Página | Secções (ordenadas, todas `defaultOpen={false}`) |
|---|---|
| `/admin/conteudos/<courseId>` | 1. Detalhes do curso · 2. Módulos · 3. Estatísticas · 4. Zona de perigo |
| `/admin/conteudos/<courseId>/<moduleId>` | 1. Detalhes do módulo · 2. Aulas · 3. Zona de perigo |
| `/admin/conteudos/<courseId>/<moduleId>?editar=<lessonId>` | 1. Detalhes da aula |

A secção "filhos" (Módulos, Aulas) contém form "Criar novo" + lista com edit inline + reorder. O nível mais baixo (Aula) só tem detalhes — não tem filhos.

### Pré-requisitos sequenciais — ADIADOS PARA V4
Não fazer em V3.3. Dado o prazo 01-07-2026 e o tamanho da feature (schema + RLS + UI de edição + UI de bloqueio + testes), fica para depois do lançamento.

Casos a satisfazer eventualmente:
- Aula 2 só clicável depois de aula 1 concluída.
- Módulo 2 só acessível depois de módulo 1 concluído.
- Curso "Mat 2" só acessível depois de "Mat 1" concluído.
- Configurável na edição (opt-in por nó ou toggle global por curso — decidir em V4).

---

## Ordem das PRs

| # | Foco | Tamanho | Risco | Bloqueia próxima? |
|---|---|---|---|---|
| **PR1** | Collapsibles fechados + estrutura consistente | XS | Baixo | Não |
| **PR2** | Copy /meus-cursos (ícone fora + textos novos) | XS | Baixo | Não |
| **PR3** | Admin: linhas clicáveis + stats card + numeração `1.x.y` | S | Baixo | Não |
| **PR4** | CourseCard split 50/50 | M | Médio (componente partilhado) | Não |
| **PR5** | Enrollment + estado anónimo | L | Alto (schema + RLS + 3 views) | Sim — bloqueia merge final V3.3 |

### Critério de avanço
- Todas as PRs ficam em sub-branches a partir de `v3-cursos`.
- Cada PR mergea para `v3-cursos` independentemente, com testes verdes.
- `v3-cursos → main` só depois de PR5 + testemunhos finais do ministério.

---

## Ficheiros prováveis por PR (pista para o próximo Claude)

**PR1 — Collapsibles**
- `src/app/admin/conteudos/[courseId]/page.tsx` — secções e ordem
- `src/app/admin/conteudos/[courseId]/[moduleId]/page.tsx` — idem
- `src/components/ui/collapsible-section.tsx` — confirmar `defaultOpen` default
- Tests: `collapsible-section.test.tsx`

**PR2 — Copy /meus-cursos**
- `src/app/meus-cursos/meus-cursos-content.tsx` — texto + remover `BookMarked`
- Tests: `meus-cursos-content.test.tsx`

**PR3 — Admin clicável + stats + numeração**
- `src/app/admin/conteudos/page.tsx` — remover coluna Ações, linha clicável
- `src/app/admin/conteudos/[courseId]/page.tsx` — stats vira secção (em vez de link `/stats`)
- `src/app/admin/conteudos/[courseId]/stats/page.tsx` — pode ficar como deep-link ou ser absorvida
- `src/app/admin/conteudos/course-tree.tsx` — numeração
- `src/app/admin/conteudos/module-list.tsx` + `lesson-list.tsx` — numeração

**PR4 — CourseCard split**
- `src/components/site/course-card.tsx` — reorganizar layout flex
- `src/lib/courses/course-image.tsx` — talvez variant nova `card-split`
- Tests: `course-image.test.tsx`, `conteudos/page.test.tsx`, `meus-cursos-content.test.tsx`

**PR5 — Enrollment + anónimo**
- Migration nova em `supabase/migrations/` — `course_access_log` ganha `unenrolled_at` OU nova tabela `enrollments`
- Migration nova — relaxar `courses` RLS para SELECT anónimo (publicados + sem tags)
- `src/lib/courses/enrollment.ts` (novo) — `getEnrollmentState(courseId)`, `enrollAction`, `unenrollAction`
- `src/app/conteudos/[courseId]/page.tsx` — 3 vistas (switch por estado)
- `src/app/conteudos/[courseId]/start-course-cta.tsx` — passa de "Começar" plain para enroll
- Tests: vários novos

---

## O que IGNORAR de pedidos anteriores

- Reorganização da pasta raiz (mover `claude-code-psb-guide.md` etc.) — **adiada indefinidamente**.
- O parágrafo "Vou frasear isto de uma maneira diferente..." na conversa original — substituído pela frase final do user.
- Frase "Pode usar palavras em português" — confirmada como descrição da experiência, não instrução.
