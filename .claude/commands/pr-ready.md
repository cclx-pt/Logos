---
description: Checklist pré-PR — testes, PT-PT, docs atualizados, branch correta
allowed-tools: Bash(git rev-parse:*), Bash(git diff:*), Bash(git status:*), Bash(git log:*)
---

Checklist Logos antes de abrir Pull Request. Executa **sequencialmente** e para na primeira falha crítica.

## 1. Branch correta

Corre `git rev-parse --abbrev-ref HEAD`.

- Se a branch atual for **`main`** → ❌ **PARA**. Reporta:
  > Estás em `main`. CLAUDE.md proíbe push direto para `main`. Cria uma branch (`git checkout -b <nome>`) antes de continuar.

## 2. Testes e qualidade

Invoca o sub-agent `test-runner`.

- Se falhar → ❌ **PARA**. Reporta o output do agent. Não passa para os passos seguintes.

## 3. Auditoria PT-PT

Lista os ficheiros alterados vs `main` (`git diff --name-only main...HEAD`). Filtra para os que possam conter strings user-facing (`*.tsx`, `*.jsx`, `*.ts` em `app/`, `components/`, `lib/emails/`, etc.).

Invoca o sub-agent `pt-pt-reviewer` apenas nesses ficheiros.

- Se houver achados PT-BR ou inglês → ⚠️ **avisa** mas não bloqueia. Apresenta a lista de `path:linha — sugestão`.
- Se não houver achados → ✅.

## 4. Documentação

Verifica se há entrada no `changelog.md` correspondente à feature/branch atual:

- Lê o último commit (`git log -1 --pretty=%B`) e procura no `changelog.md` uma entrada compatível.
- Se **não houver** entrada relevante → propõe ao utilizador correr `/update-docs <slug>` antes de avançar. Não corres `doc-updater` automaticamente — é decisão do utilizador.

## 5. Resumo final

Apresenta um quadro:

```
✅/❌ Branch
✅/❌ Testes
✅/⚠️ PT-PT
✅/⚠️ Docs
```

Se tudo estiver verde (✅) ou apenas com avisos (⚠️) que o utilizador aceite:

> Pronto para PR. Sugestão: usar `/commit-commands:commit-push-pr` para abrir o PR.

Se houver ❌, indica o passo a corrigir antes de voltar a correr `/pr-ready`.
