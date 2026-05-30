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

## Fronteira V3 / V5 (deliberada)

Fica **fora** desta entrega e reservado para **V5** (SPEC_1.md §9, "dashboard de estatísticas mais profundo"):
taxas/percentagens de conclusão, segmentação por etiqueta, tendências no tempo (gráficos), exportação CSV, funil de conversão. Quando V5 chegar, `getAdminOverview` provavelmente passa para uma RPC / view materializada.
