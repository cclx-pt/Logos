# ci.md — Continuous Integration (GitHub Actions)

> **Versão:** Setup (pré-V1) · **Última atualização:** 12-05-2026 · **Estado:** workflow `ci.yml` ativo em PR + push para `main`

## 1. Objetivo

Garantir que **nenhum PR pode mergir em `main`** sem passar:

1. Lint estrito (zero warnings)
2. Typecheck (`tsc --noEmit`)
3. Testes unitários (Vitest)
4. Verificação de formato (Prettier)

Este documento descreve o workflow `ci.yml`, as decisões de design, e o roadmap (E2E na V3).

> **Branch protection em `main` passou a elegível em 12-05-2026.** O repositório `cclx-pt/Logos` mudou de privado para público (decisão tomada para caber no plano Hobby do Vercel — ver `feature-docs/vercel.md` §5), o que torna a branch protection do GitHub disponível no plano gratuito. Activação fica como tarefa nova em `status.md`. Até estar activa, a regra "PR obrigatório, nunca push directo para `main`" continua honor-system em `CLAUDE.md`, reforçada por `git push --force`, `git reset --hard` e `git branch -D *main*` em `.claude/settings.json` `permissions.deny`. Decisão registada em `SPEC_1.md` §16.

---

## 2. Triggers

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

- **`pull_request`** — corre em qualquer PR aberto contra `main`. É a salvaguarda principal.
- **`push` para `main`** — corre depois do squash-merge para garantir que `main` está sempre verde (ex.: se algo entrou via merge conflict resolution).

Não corre noutros pushes (ex.: feature branches sem PR aberto) para poupar minutos do plano gratuito.

---

## 3. Concurrency

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Quando se faz force-push ou novos commits ao mesmo PR/branch, a run em curso é **cancelada** e arranca uma nova. Evita gastar minutos em código que já é stale.

---

## 4. Job único: `quality`

Sequencial dentro de um só runner Ubuntu. Decisão consciente vs. jobs paralelos:

| Opção | Pros | Contras |
|---|---|---|
| **Único job** (escolhido) | Boring; uma só install; menos minutos | Não paraleliza lint/test |
| Jobs paralelos | Mais rápido em grandes suites | Duplica `pnpm install` em cada job (sem cache partilhado nativo) |

A suite hoje corre em ~30s na CI. Não há ganho real em paralelizar; mais complexidade pelo mesmo tempo. Reavaliar quando o build > 3 min.

---

## 5. Steps explicados

### 5.1. Checkout
```yaml
- uses: actions/checkout@v4
```
Default: shallow clone (`fetch-depth: 1`) — suficiente para lint/test, não para `git log` history.

### 5.2. Setup pnpm
```yaml
- uses: pnpm/action-setup@v4
```
**Sem versão explícita** — a action lê o campo `packageManager` em `package.json` (`pnpm@10.33.2`). Uma só fonte de verdade da versão pnpm; alterar `package.json` propaga automaticamente para CI.

### 5.3. Setup Node + cache pnpm
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: pnpm
```
- **Node 20** — alinha com `engines.node >=20` em `package.json`. Versão LTS estável.
- **`cache: pnpm`** — `actions/setup-node@v4` reconhece o pnpm store e cacheia entre runs. Hit rate típico: >90% após o primeiro install. Reduz install de ~15s para ~3s.

### 5.4. Install
```yaml
- run: pnpm install --frozen-lockfile
```
**`--frozen-lockfile`** — falha se `pnpm-lock.yaml` divergir do `package.json`. Detecta deps adicionadas localmente sem `pnpm install`.

### 5.5. Lint estrito
```yaml
- run: pnpm exec eslint --max-warnings 0
```
- Inline em vez de novo script (`lint:strict`) para manter `package.json` enxuto. Local `pnpm lint` permite warnings (feedback ágil); CI exige zero.
- `pnpm exec eslint` em vez de `pnpm lint -- --max-warnings 0` — mais robusto contra alterações ao script `lint`.

### 5.6. Typecheck
```yaml
- run: pnpm typecheck
```
`tsc --noEmit` — não gera ficheiros, só valida tipos.

### 5.7. Test
```yaml
- run: pnpm test
```
Vitest run-mode (uma passagem). Coverage **não** corre na CI por defeito — `pnpm test:coverage` fica para escolha manual ou jobs futuros (V2+).

### 5.8. Format check
```yaml
- run: pnpm format:check
```
**Adicionado além do que `SPEC_1.md` §11 lista.** Decisão: o custo é negligenciável (~1s) e protege contra drift de estilo entre máquinas. `architecture.md` §10 vai ser atualizado para refletir esta inclusão.

---

## 6. `.gitattributes` (instalado neste mesmo PR)

```
* text=auto eol=lf
*.png    binary
*.svg    text eol=lf
...
```

**Porquê:** Windows convertia LF→CRLF na checkout (Git `core.autocrlf=true`), e Prettier (`endOfLine: 'lf'`) flaggava esses ficheiros. Cada `pnpm format` reescrevia 14 ficheiros de cada vez — ruído insuportável. Com `.gitattributes`:

- Storage no Git: sempre LF.
- Working tree em qualquer SO: sempre LF.
- Os warnings `LF will be replaced by CRLF the next time Git touches it` desaparecem.
- CI (Linux, LF nativo) e dev local (Windows, agora LF) usam o mesmo formato.

---

## 7. Permissions

```yaml
permissions:
  contents: read
```

Princípio do menor privilégio. O job só lê o repo. Se um dia precisarmos de comentar em PRs (ex.: coverage report bot), elevamos para `pull-requests: write` localmente nesse step.

---

## 8. Timeout

```yaml
timeout-minutes: 10
```

Suite atual corre em <1 min. 10 min é uma rede de segurança contra flakes/hangs (ex.: se um teste entrar em loop infinito). Reavaliar para 5 min quando V3 trouxer Playwright.

---

## 9. Roadmap

### V1 (atual)
- [x] lint, typecheck, test, format:check em PR e push para main

### V2
- [ ] Coverage thresholds (~70% em `src/lib/` quando houver lógica de auth/etiquetas)
- [ ] Comment de coverage no PR? (avaliar se vale a pena vs ler `coverage/index.html` localmente)

### V3
- [ ] `pnpm test:e2e` — Playwright contra **Vercel Preview Deploy URL**. Necessita:
  - Token Vercel para obter o preview URL via API
  - Job adicional `e2e` que depende de `quality` E de o deploy preview estar pronto
  - Ou usar [`vercel/setup-vercel-deploy@v1`](https://github.com/vercel/setup-vercel-deploy) (a investigar) para esperar pela URL.

### V6+
- [ ] Lighthouse CI (perf budgets) só se a aplicação ficar pesada o suficiente para justificar.
- [ ] Audit de bundle size (`next-bundle-analyzer` em CI).

---

## 10. Troubleshooting

### "ESLint found too many warnings (maximum: 0)"
Algures há um warning não resolvido. Local: `pnpm lint`. Resolver. Se for falso positivo, adicionar à secção `globalIgnores` em `eslint.config.mjs` ou refinar a regra em `eslint.config.mjs` rules.

### "ERR_PNPM_OUTDATED_LOCKFILE"
Lockfile não bate certo com `package.json`. Local: `pnpm install` (atualiza `pnpm-lock.yaml`), commitar.

### "Code style issues found in N files"
Esquecimento de `pnpm format` antes do commit. Resolver localmente e push novo. Se persistir mesmo após format, é provavelmente o problema CRLF/LF — confirmar que `.gitattributes` está commitado e correr `git add --renormalize . && git commit`.

### Cache miss permanente
`pnpm-lock.yaml` mudou (deps novas). É expected — o próximo run reconstrói o cache.

### Tempo de run >5 min
- Verificar se algum teste prende (loop, fetch a serviço externo). `pnpm test --reporter=verbose` em local.
- Confirmar `cancel-in-progress: true` está ativo (evita waste em pushes consecutivos).

---

## 11. Como observar o estado da pipeline

```bash
# Lista PRs com checks
gh pr list --state open --json number,title,statusCheckRollup

# Ver checks de um PR específico
gh pr checks <PR_NUMBER>

# Ver run em detalhe (com logs)
gh run list --limit 5
gh run view <RUN_ID> --log
```

Em PRs do projeto, o status aparece como ✅/❌/🟡 ao lado do título no GitHub.

---

## 12. Referências

- `architecture.md` §10 — pipeline canónica
- `SPEC_1.md` §13 — fluxo de dev (CI obrigatório)
- `feature-docs/testing.md` — Vitest config (que a CI usa via `pnpm test`)
- `feature-docs/nextjs-init.md` — scripts npm-runtime invocados pela CI
- [`pnpm/action-setup`](https://github.com/pnpm/action-setup)
- [`actions/setup-node`](https://github.com/actions/setup-node)
