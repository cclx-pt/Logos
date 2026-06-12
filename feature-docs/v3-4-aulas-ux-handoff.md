# V3.4 - Aulas: template só-vídeo + UX do leitor (handoff/plano)

> **Status:** LOTE COMPLETO (os 7 itens). **PR1 #53** (template só-vídeo), **PR2 #54** (leitor de aula) e **PR3 #55** (cabeçalho do módulo) mergeados em `v3-cursos`. Vive em `v3-cursos` (nunca mergea em `main` antes de 01-07-2026). Pendente: confirmação do líder às decisões dos itens 6 e 7 (ajustáveis); depois este handoff dá lugar a `feature-docs/v3-4-iteration.md`.
>
> Este ficheiro é o plano-mestre das 7 mudanças pedidas pelo líder (12-06-2026). À medida que cada PR fecha, a sua secção passa de "Plano" a "Feito" com o nº do PR. Quando todas fecharem, este handoff dá lugar a `feature-docs/v3-4-iteration.md`.

## Contexto

V3 está fechada dev-side. Estas mudanças são um passe de produto sobre a experiência de **aula** e **módulo**: um novo modelo de aula (só vídeo) e uma série de afinações de UX no leitor. Não há mudança de âmbito de versão - o template extra é exatamente a extensibilidade que `SPEC_1.md` §"Modelos de aula" antecipa ("adicionar novos modelos no futuro sem reescrever o modelo de dados").

## As 7 mudanças (pedido original)

1. Template **só-vídeo**: uma aula pode ser vídeo + apostila, só vídeo, ou só apostila.
2. **Campos condicionais** no admin: os inputs (URL YouTube / ficheiro PDF) que aparecem dependem do template escolhido.
3. **Árvore de navegação** à direita na vista de aula (como a `CourseTree` da área admin).
4. Descrição longa da aula **fica alinhada/centrada** como deve - hoje "atira tudo para a direita".
5. **Sem botão "próxima aula"** na última aula do módulo.
6. Botão de **sair/voltar ao curso** redesenhado (hoje pequeno, não parece opção) + remover "a parte de cima".
7. **Cabeçalho do módulo** mais limpo: tirar a contagem "Módulo 1 de 2"; manter título + descrição; repensar o indicador de conclusão.

## Agrupamento em PRs

Três PRs sequenciais, cada um auto-contido e testável. A ordem é flexível (são em grande medida independentes), mas PR1 primeiro porque mexe no modelo de dados e muda como o leitor renderiza.

| PR | Título | Itens | Toca |
|----|--------|-------|------|
| **PR1** | Template só-vídeo | 1 + 2 | DB migration, `lessons-actions.ts`, form de aula (novo client component), `lesson-list.tsx`, leitor de aula, leitor de módulo, SPEC |
| **PR2** | Leitor de aula: navegação + layout | 3 + 4 + 5 + 6 | `conteudos/[courseId]/[lessonId]/page.tsx`, nova `lesson-tree.tsx`, helper de navegação módulo-scoped + testes |
| **PR3** | Cabeçalho do módulo | 7 | `conteudos/[courseId]/modulos/[moduleId]/page.tsx` |

---

## PR1 - Template só-vídeo (itens 1 + 2) — ✅ IMPLEMENTADO

> Branch `v3-4-pr1-template-video`. Migration aplicada a `logos-dev` (constraints confirmados via `pg_get_constraintdef`). 461 testes verdes, lint/typecheck/format limpos. Ficheiros: migration `20260612120000`, `lessons-actions.ts`, novo `lesson-form.tsx` (Client Component), `lesson-list.tsx`, `detail.ts` (tipos + `pdf_storage_path` nullable), novo `template-label.ts`, leitor de aula + de módulo + landing do curso, `access-actions.ts` (guard), admin module page (forms → `<LessonForm>`). Testes novos: criar/editar `video` + label `só vídeo`.

### Modelo de dados (migration, **só `logos-dev`**)

Estado atual da tabela `lessons` (migration `20260519020000`):
- `template text not null check (template in ('pdf','video_pdf'))`
- `constraint lessons_video_requires_youtube check (template <> 'video_pdf' or youtube_url is not null)`
- `constraint lessons_template_requires_pdf check (pdf_storage_path is not null)` ← **PDF sempre obrigatório hoje**

Nova migration `YYYYMMDDHHMMSS_lessons_video_only_template.sql`:
1. `template` CHECK passa a `in ('pdf','video','video_pdf')`.
2. `lessons_video_requires_youtube` → **vídeo exige YouTube**: `check (template = 'pdf' or youtube_url is not null)` (vale para `video` e `video_pdf`).
3. `lessons_template_requires_pdf` → **PDF só quando o template o usa**: `check (template = 'video' or pdf_storage_path is not null)`.
4. Atualizar os `comment on column` (template, pdf_storage_path deixa de ser "sempre obrigatório").

> **Regra dura:** migration **nunca** aplicada a `logos-prod` antes de 01-07-2026. Aplicar via MCP a `logos-dev` e registar a versão exata do ficheiro em `schema_migrations` (gotcha de divergência - ver `feature-docs/seguranca-port-v3.md` / memória do projeto).

### Server Actions (`lessons-actions.ts`)
- `TEMPLATES = ['pdf','video','video_pdf']`; mensagem de `validateTemplate` atualizada.
- YouTube obrigatório quando `template !== 'pdf'`.
- PDF obrigatório quando `template !== 'video'`:
  - `createLessonAction`: se `video`, inserir com `pdf_storage_path: null`, **sem** upload nem placeholder. Caso contrário, fluxo atual (placeholder → upload → update do path).
  - `updateLessonAction` (regra de coerência a documentar):
    - → `video`: limpar `pdf_storage_path` (null) e remover o ficheiro do bucket best-effort.
    - `video` → `pdf`/`video_pdf`: exigir upload de PDF no mesmo submit (não há nenhum guardado).
    - → `pdf`: limpar `youtube_url` (já hoje acontece).

### Admin form - campos condicionais (item 2)
O form de criar/editar aula vive inline na página de módulo (Server Component) e mostra **sempre** os dois inputs. Para os tornar condicionais ao template selecionado sem reload:
- Extrair o form para um **Client Component** `src/app/admin/conteudos/lesson-form.tsx` (`'use client'`), partilhado por criar e editar. Recebe `action` (Server Action), defaults e hidden fields por props.
- Estado local `template`; renderização condicional:
  - `pdf` → só input de PDF.
  - `video` → só input de URL YouTube.
  - `video_pdf` → ambos.
- Atributos `required` acompanham (YouTube required se tem vídeo; PDF required só em criar e só se tem PDF; em editar nunca required - mantém o atual).

### Leitura (renderização por template)
- `lesson-list.tsx` (admin) e leitor de módulo: label do template passa a 3 valores - `só pdf` | `só vídeo` | `vídeo + pdf`. Tipo `LessonListItem.template` → `'pdf' | 'video' | 'video_pdf'`.
- Leitor de aula (`[lessonId]/page.tsx`):
  - `youtubeId` calculado quando `template !== 'pdf'` (hoje só `video_pdf`).
  - Secção "Apostila" só renderiza quando `template !== 'video'`.

### Testes PR1
- `lessons-actions.test.ts`: criar/editar com `video` (YouTube obrigatório, PDF ausente; sem upload), coerência de transições de template.
- `lesson-list.test.tsx`: label dos 3 templates.
- `[lessonId]/page.test.tsx`: render só-vídeo (sem secção apostila) e só-pdf (sem iframe vídeo).

### Docs PR1
SPEC_1.md (tabela "Modelos de aula" ganha `video`; bump de versão), `architecture.md` (enum de template), `changelog.md`, `status.md`.

---

## PR2 - Leitor de aula: navegação + layout (itens 3 + 4 + 5 + 6) — ✅ IMPLEMENTADO

> Branch `v3-4-pr2-leitor-aula`. 469 testes verdes; lint/typecheck/format limpos. Ficheiros: `[lessonId]/page.tsx` (layout flex + botão de saída + nav módulo-scoped), novo `lesson-tree.tsx` (+ teste), `detail.ts` (`getModuleLessonNavigation` + teste). **Decisões do item 6 (a confirmar pelo líder):** removido o breadcrumb do topo ("a parte de cima") e colocado um botão claro **"← Voltar ao curso"** no topo-esquerdo; alvo = landing do curso. Se o líder quiser outra coisa (manter breadcrumb, botão no fundo, texto "Sair do curso", ou árvore também a ligar a páginas de módulo), é ajuste rápido.

Ficheiro central: `src/app/conteudos/[courseId]/[lessonId]/page.tsx`.

### Item 3 - árvore de navegação à direita
- Nova `src/app/conteudos/[courseId]/[lessonId]/lesson-tree.tsx` (análoga à admin `CourseTree`, mas pública e a apontar para `/conteudos/[courseId]/[lessonId]`):
  - Módulos colapsáveis (`<details>`, zero JS) → aulas; módulo atual aberto; aula atual destacada.
  - Check nas aulas concluídas. Precisa do set de concluídas de **todo o curso** (hoje a página só carrega o do módulo atual) - acrescentar `getCompletedLessonIds(allLessonIds)`.
  - Visível só em `xl+` (`hidden xl:block w-64 shrink-0`), igual ao admin. Mobile continua a navegar por breadcrumb/nav inferior/página de módulo.
- Página passa a layout `flex gap-*` (conteúdo `min-w-0 flex-1` + `aside`).

### Item 4 - descrição centrada
- Com o novo flex, fixar a coluna de conteúdo a uma medida legível (`max-w-3xl`, `mx-auto`) e trocar `text-justify hyphens-auto` por alinhamento normal à esquerda (o justify em coluna estreita é que cria o efeito "atira para a direita"). Confirmar visualmente.

### Item 5 - sem "próxima aula" na última aula do módulo
- A navegação inferior passa a ser **módulo-scoped**: `next`/`previous` calculados só dentro do módulo atual. Última aula do módulo → `next = null` → não renderiza o botão. A progressão entre módulos já é tratada pelo banner "Módulo concluído → próximo módulo" (e agora também pela árvore).
- Novo helper testável `getModuleLessonNavigation(module, lessonId)` (em `detail.ts` ou `completion.ts`), a substituir o uso de `getLessonNavigation` (course-wide) nesta página. Manter/atualizar testes.

### Item 6 - botão sair/voltar + "parte de cima" *(ABERTO - confirmar ao chegar)*
- Interpretação proposta: "a parte de cima" = o breadcrumb no topo da página de aula; com a árvore à direita ela fica redundante. Substituir o link minúsculo "Voltar ao curso" por um controlo que leia como botão secundário real.
- **A confirmar contigo:** (a) é mesmo o breadcrumb a remover? (b) "Voltar ao curso" no topo-esquerdo ou no fundo? (c) texto "Voltar ao curso" vs "Sair do curso".

### Testes PR2
Helper de navegação módulo-scoped (primeira/última/meio), `lesson-tree` (current/concluídas/links).

### Docs PR2
`changelog.md`, `status.md`, `architecture.md` se o layout do leitor mudar de forma estrutural; entrada em feature-docs.

---

## PR3 - Cabeçalho do módulo (item 7) — ✅ IMPLEMENTADO

> Branch `v3-4-pr3-cabecalho-modulo` (ramificada de `v3-cursos`, independente do PR2). 461 testes verdes; lint/typecheck/format limpos. Mudança puramente apresentacional em `modulos/[moduleId]/page.tsx`: fora o eyebrow "Módulo N de M" e o indicador de conclusão solto; header = título + descrição (alinhada à esquerda); "{x}/{total} concluídas" + "✓ concluído" movido para junto do título "Aulas"; breadcrumb mostra o título do módulo. **Decisão (item 7, era aberto):** o indicador foi para ao lado de "Aulas". Se quiseres outro sítio/forma, é ajuste rápido.

Ficheiro: `src/app/conteudos/[courseId]/modulos/[moduleId]/page.tsx`.

- **Remover** o eyebrow "Módulo N de M" (a contagem). Manter título + descrição.
- **Repensar o indicador de conclusão** (hoje: linha "{x}/{total} concluídas" + "✓ Módulo concluído" solta no header). Proposta: mover a contagem para junto do cabeçalho da secção **"Aulas"** (ex.: `Aulas · {x}/{total} concluídas`), e o "✓ Módulo concluído" como marca discreta inline só quando completo. *(Tratamento exato ABERTO - "arranja outra maneira e logo vemos".)*
- Breadcrumb pode manter "Módulo N" ou simplificar (decisão menor na implementação).

### Docs PR3
`changelog.md`, `status.md`, entrada em feature-docs.

---

## Perguntas abertas (resolver no item respetivo)
- **Item 6:** elemento exato a remover ("parte de cima") e desenho/posição/texto do botão de saída.
- **Item 7:** tratamento exato do indicador de conclusão.
- **Item 4:** validação visual do alinhamento.

## Invariantes a respeitar (CLAUDE.md)
- PT-PT em toda a UI; **sem em dashes** (só hyphen).
- IDs internos estáveis: reordenar/renomear nunca invalida conclusões.
- Conteúdo restrito por etiqueta é invisível (não afetado, mas não regredir).
- Sem barras de progresso/percentagens/gamificação (o "{x}/{total} concluídas" é contagem textual, permitido; nada de barra).
- Migrations V3 só em `logos-dev`. Nunca push direto a `main`; PRs ficam em `v3-cursos`.
- Testes obrigatórios para lógica de conclusão (itens 5 e 7 tocam-na).
