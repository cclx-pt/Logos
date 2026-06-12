# V3.4 — Aulas: template só-vídeo + UX do leitor

> **Status:** fechada em `v3-cursos` (PR1-PR5 mergeadas). Nada mergea em `main` até ao lançamento (01-07-2026). Substitui o antigo `v3-4-aulas-ux-handoff.md` (apagado).

## Contexto

Passe de produto sobre a experiência de **aula** e **módulo**, pedido pelo líder a 12-06-2026 (7 itens). Introduz um novo modelo de aula (só vídeo) e uma série de afinações de UX no leitor. Não houve mudança de âmbito de versão: o template extra é a extensibilidade que `SPEC_1.md` §"Modelos de aula" já antecipava.

Mapa dos 7 itens originais → PRs:

| # | Pedido | PR |
|---|--------|----|
| 1 | Template **só-vídeo** (aula = vídeo+PDF, só vídeo, ou só PDF) | PR1 |
| 2 | Campos do form **condicionais** ao template escolhido | PR1 |
| 3 | **Árvore de navegação** na vista de aula | PR2 |
| 4 | Descrição da aula **alinhada/legível** (não "atira para a direita") | PR2 (+ PR4, PR5) |
| 5 | Sem **"próxima aula"** na última aula do módulo | PR2 |
| 6 | Botão de **sair/voltar** redesenhado + tirar a "parte de cima" | PR2 (+ PR5) |
| 7 | **Cabeçalho do módulo** mais limpo | PR3 |

Afinações posteriores ao feedback do líder: PR4 (conteúdo centrado + sticky da árvore), PR5 (breadcrumbs fora de todas as páginas de leitura, descrições na coluna central, botão "Sair do curso").

## Decisões fechadas

| Tema | Decisão |
|---|---|
| Âmbito do template `video` | **Em âmbito.** SPEC §"Modelos de aula" prevê novos modelos sem reescrever dados. SPEC bump 3.2. |
| Coerência template ↔ campos (DB) | CHECK de `lessons` relaxado: vídeo (`video`/`video_pdf`) exige `youtube_url`; apostila (`pdf`/`video_pdf`) exige `pdf_storage_path`; `video` guarda `pdf_storage_path = null`. Migration `20260612120000` **só `logos-dev`**. |
| Form de aula no admin | Passa a **Client Component** (`lesson-form.tsx`) para mostrar só os campos do template. Validação real continua nas Server Actions + CHECK. |
| Navegação inferior da aula | **Módulo-scoped** (`getModuleLessonNavigation`): a última aula do módulo não tem "Próxima aula". A passagem entre módulos é o banner de conclusão + a árvore. |
| Árvore da vista de aula | Espelho público da `CourseTree` do admin (`lesson-tree.tsx`), só `xl+`, **sticky abaixo do cabeçalho fixo** (`top-20` + `max-h-[calc(100vh-7rem)] overflow-y-auto` — o `top-6` original enfiava por baixo do header `h-16`). |
| Layout do leitor de aula | Conteúdo **centrado na página** via espelho invisível da árvore à esquerda (`max-w-[84rem]` + flanco `w-64` de cada lado); árvore só à direita. |
| Breadcrumbs | **Fora** das páginas de aula, módulo e curso. Navegação: árvore (aula) + lista de aulas + saída para o curso. Aula e módulo têm "← Voltar ao curso" no topo; curso usa o "Conteúdos" do cabeçalho do site. |
| Descrições (aula/módulo/curso) | **Coluna central, texto à esquerda** (não `text-align: center`). Saíram `text-justify`/`hyphens-auto`/`max-w` estreito — era o que criava o efeito "atira para a direita". |
| Cabeçalho do módulo | Sem eyebrow "Módulo N de M"; só título + descrição. "{x}/{total} concluídas" + "✓ concluído" movido para junto do título "Aulas". |
| Botão "Sair do curso" | Deixa de ser link minúsculo: botão `h-11`, fundo neutro, **contorno vermelho** (`border-destructive`), texto vermelho no hover. |
| "Meus cursos" vs catálogo | **Opção A (mantida):** `/meus-cursos` = só inscrições **ativas** (`course_access_log` não-unenrolled). O badge "Concluído" do catálogo vem de `course_completions`, independente da inscrição. Um curso concluído de que o utilizador saiu **não** fica em "Terminados" — é intencional (V3.3 PR8). |

## Plano de PRs (todas mergeadas)

### PR1 — Template só-vídeo (#53)
- Migration `20260612120000_lessons_video_only_template.sql` (só `logos-dev`): `template in ('pdf','video','video_pdf')`; CHECK de vídeo/apostila relaxados.
- `lessons-actions.ts`: YouTube obrigatório se o template tem vídeo; PDF obrigatório se tem apostila; criar `video` insere `pdf_storage_path null` sem upload; mudar para `video` limpa o path e remove o ficheiro best-effort.
- **`lesson-form.tsx`** (novo Client Component, criar+editar): campos condicionais ao template.
- `detail.ts`: tipo `LessonTemplate`; `pdf_storage_path` nullable. `template-label.ts` (etiquetas do leitor). `lesson-list.tsx` (etiquetas do admin: só pdf/só vídeo/vídeo+pdf). `access-actions.ts`: guard para aulas sem apostila.
- Leitor de aula renderiza vídeo/apostila conforme o template. SPEC bump 3.2.

### PR2 — Leitor de aula: navegação + layout (#54)
- **`lesson-tree.tsx`**: árvore à direita (módulos colapsáveis → aulas, aula atual destacada, ✓ nas concluídas), só `xl+`. A página carrega a conclusão de todo o curso.
- Descrição da aula alinhada à esquerda numa coluna legível.
- **`getModuleLessonNavigation`** (`detail.ts`): navegação inferior módulo-scoped; nav só renderiza se houver anterior/próxima.
- Breadcrumb do topo da aula removido → botão "← Voltar ao curso".
- Testes: `getModuleLessonNavigation` (5) + `lesson-tree` (3).

### PR3 — Cabeçalho do módulo (#55)
- Fora o eyebrow "Módulo N de M" e o indicador de conclusão solto; header = título + descrição (alinhada à esquerda).
- "{x}/{total} concluídas" + "✓ concluído" movido para junto do título "Aulas".
- Breadcrumb mostra o título do módulo.

### PR4 — Leitor centrado + sticky da árvore (#56)
- Conteúdo principal centrado na página (espelho invisível da árvore à esquerda, `max-w-[84rem]`).
- Árvore sticky deixa de enfiar por baixo do cabeçalho fixo: `top-20` + `max-h-[calc(100vh-7rem)] overflow-y-auto`.

### PR5 — Breadcrumbs + descrições + "Sair do curso" (#57)
- Breadcrumb removida das páginas de **curso** e **módulo** (módulo ganha "← Voltar ao curso" no topo).
- Descrições de **curso** e **módulo** passam a preencher a coluna central (sem `text-justify`/`max-w` estreito), alinhadas com a aula.
- Botão **"Sair do curso"** maior, neutro, com contorno vermelho.

## Notas
- Migration V3.4 só em `logos-dev`. Sobe a `logos-prod` no lançamento, com o resto das migrations V3 (a versão exata do ficheiro deve ser registada em `schema_migrations` para alinhar com prod — ver `feature-docs/seguranca-port-v3.md`).
- Testes: 469 verdes no fim do lote (lint/typecheck/format limpos).
- A lógica de "Meus cursos" (opção A) foi confirmada com o líder; o caso reportado ("Concluído no catálogo, ausente em Meus cursos") era um estado momentâneo pós-saída do curso, não bug.
