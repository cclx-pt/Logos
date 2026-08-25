# Estatísticas admin — vista agregada (V3-básico)

> **Estado:** concluída em 30-05-2026. Só em `v3-cursos`.
> **Versão:** V3 ("estatísticas básicas visíveis ao admin", SPEC_1.md §9).

## O que é

Página `/admin/estatisticas` (admin + super_admin) que junta num só sítio os números leves de utilização que antes só existiam por curso (dentro da CollapsibleSection "Estatísticas" de cada curso em `/admin/conteudos/<courseId>`, que se mantém).

- **5 cards de totais:** cursos publicados (com rascunhos no hint), acessos totais, utilizadores activos, aulas concluídas, cursos concluídos.
- **Tabela-resumo por curso:** acessos, utilizadores únicos, conclusões de aulas. Ordenada por acessos desc (título desempata). Cada linha liga a `/admin/conteudos/<courseId>` para o detalhe.

## Como está feito

| Peça | Ficheiro |
|---|---|
| Agregação (pura, testável) + fetch | `src/lib/courses/overview-stats.ts` (`aggregateOverview`, `getAdminOverview`) |
| Card partilhado | `src/components/admin/stat-card.tsx` (`StatCard`, extraído de `course-stats-content.tsx`) |
| Página + skeleton | `src/app/admin/estatisticas/{page,loading}.tsx` |
| Link na sidebar | `src/app/admin/layout.tsx` |
| Testes | `src/lib/courses/overview-stats.test.ts` (7), `src/app/admin/layout.test.tsx` |

**Decisões:**
- **Utilizadores activos** = `count(distinct user_id)` de `course_access_log`, não de `profiles` (cujo RLS SELECT é só super_admin). Além de admin-safe, mede engagement melhor que "registados".
- **Sem N+1:** um SELECT por tabela (courses, modules, lessons, course_access_log, lesson_completions, course_completions) + agregação em JS. Suficiente para os volumes de V3.
- **Sem migration:** UI read-only; o RLS de admin já dá SELECT a tudo.

## Detalhe profundo (30-05-2026 — V5 puxado para V3)

A pedido do utilizador, o dashboard ganhou detalhe muito além do básico. **Só quantidades** (sem percentagens). Migrations `20260530130000` (`lesson_views` + `count_registered_users()`) aplicadas a `logos-dev`.

- **Overview (`/admin/estatisticas`)** ganhou card **Utilizadores registados** (RPC `count_registered_users`, "—" se indisponível) e, por curso, colunas **Inscritos** (inscrições activas) e **Finalizações** (`course_completions`).
- **Detalhe por curso (`/admin/estatisticas/cursos/[id]`)** — cards (inscritos, finalizações, acessos, únicos) + **módulos e aulas ordenados por visitas** (visitas, visitantes únicos, conclusões) + **"Quem terminou"** (nomes + datas — **só super_admin**; admin normal vê só a contagem). Helper `stats-detail.ts` (`aggregateCourseDetail` + `buildFinishers` com gate de papel, testados).
- **Por utilizador (`/admin/estatisticas/utilizadores` + `/[id]`)** — **só super_admin**: lista com nº de cursos inscritos/terminados (pesquisável) e, por utilizador, os cursos inscritos e terminados (com datas). Helper `stats-users.ts` (`aggregateUsersOverview`, `aggregateUserDetail`, `activeEnrollmentKeys`, testados).

**Visitas a aulas:** `lesson_views` (RLS SELECT admin, INSERT self, imutável). Registo best-effort via `logLessonViewAction` + `<LessonViewBeacon>` (mount na página de aula). "Visitas" de um módulo = soma das suas aulas.

**Pesquisa + ordenação:** as tabelas que crescem (overview por curso, módulos/aulas do curso, lista por-utilizador) usam `SortableStatsTable` (`src/components/admin/sortable-stats-table.tsx`) — pesquisa opcional + ordenação por coluna (clicar no cabeçalho). O filtro corre com `useDeferredValue` (não bloqueia a escrita → INP saudável). Lógica pura testável em `src/lib/stats-table.ts`.

**Mobile:** as tabelas do admin chegam a 7 colunas, por isso vivem dentro do `TableScroll` (`src/components/admin/table-scroll.tsx`) — `overflow-x-auto`, nunca `overflow-hidden`. A distinção não é cosmética: com `overflow-hidden` as colunas da direita eram **cortadas e ficavam inalcançáveis** abaixo dos ~1000px (fix de 25-08-2026, ver `changelog.md`). O scroll é só CSS; a região focável para teclado e a dica de deslizar aparecem depois da hidratação, e só quando há mesmo o que deslizar. Qualquer tabela nova do admin deve usar o mesmo wrapper.

**PII / papéis:** tudo o que mostra **nomes** de utilizadores (quem terminou, vistas por-utilizador) é **só super_admin** — alinhado com o RLS de `profiles`. Admins normais veem todos os números agregados, mas não nomes. `count_registered_users()` devolve só a contagem (sem linhas) e só a admins.

## Fronteira V3 / V5 (deliberada)

Fica **fora** desta entrega e reservado para **V5** (SPEC_1.md §9, "dashboard de estatísticas mais profundo"):
taxas/percentagens de conclusão, segmentação por etiqueta, tendências no tempo (gráficos), exportação CSV, funil de conversão. Quando V5 chegar, `getAdminOverview` provavelmente passa para uma RPC / view materializada.
