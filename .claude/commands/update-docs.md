---
description: Atualiza changelog, status, architecture e feature-docs com base nas mudanças recentes
argument-hint: [nome-feature]
---

Invoca o sub-agent `doc-updater` para sincronizar a documentação viva do projeto Logos com o que mudou recentemente.

**Argumento (opcional):** `$ARGUMENTS` — nome curto da feature (slug em kebab-case), usado como pista para `feature-docs/<slug>.md` e para encontrar a mudança no `git log`/`git diff`.

Tarefa para o agent:

1. Inspeciona `git log`, `git diff` e `git status` para perceber o que mudou.
2. Atualiza obrigatoriamente:
   - `changelog.md` — entrada datada `DD-MM-YYYY` no topo da secção corrente, agrupada por tipo (`add`/`update`/`fix`/`docs`/`infra`).
   - `status.md` — move tarefas concluídas, ajusta milestone, atualiza "Última atualização".
3. Atualiza condicionalmente:
   - `architecture.md` — só se a mudança for **estrutural**.
   - `feature-docs/<slug>.md` — só se a feature ficou **completa**. Usa o template em `feature-docs/README.md`.
4. **Não toca** em `SPEC_1.md` nem `CLAUDE.md`. Se achares que precisam de atualização, **sinaliza ao utilizador** no resumo final.
5. Não fazes commit. Apenas edição de ficheiros.

Lembrete final: PT-PT estrito. Datas em `DD-MM-YYYY`. Estilo coerente com as entradas existentes.
