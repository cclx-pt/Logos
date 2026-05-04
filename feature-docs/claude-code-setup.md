# claude-code-setup.md — Configuração do Claude Code

> **Para que serve este documento:** garantir que qualquer máquina onde o developer trabalha no Logos tem **a mesma experiência** com Claude Code — mesmos plugins, mesmos sub-agents, mesmas slash commands, mesmas permissões partilhadas.
>
> **Estado:** ✅ Configuração transversal versionada (05-05-2026).

---

## 1. Como o Claude Code lê configuração

Camadas, por ordem de prioridade:

| Camada                       | Ficheiro                               | Versionado?      | Para que serve                                                           |
|------------------------------|----------------------------------------|------------------|--------------------------------------------------------------------------|
| Projeto (partilhada)         | `.claude/settings.json`                | ✅ commit          | Plugins, marketplaces, permissões seguras, modelo. **Igual em todas as máquinas** |
| Projeto (local por máquina)  | `.claude/settings.local.json`          | ❌ `.gitignore`    | Permissões one-off, paths absolutos da máquina, experiências locais        |
| Utilizador (global)          | `~/.claude/settings.json`              | ❌ fora do repo    | Tema, configurações pessoais transversais a todos os projetos              |
| Sub-agents do projeto        | `.claude/agents/*.md`                  | ✅ commit          | `doc-updater`, `pt-pt-reviewer`, `test-runner`, `spec-guardian`            |
| Slash commands do projeto    | `.claude/commands/*.md`                | ✅ commit          | `/update-docs`, `/version-check`, `/pr-ready`                              |

> **MCP:** este projeto **não usa `.mcp.json`**. Todos os MCPs (`mcp__github`, `mcp__supabase`, `mcp__vercel`, `mcp__ide`) vêm dos plugins listados em `enabledPlugins`. Não há MCP avulso para versionar.

---

## 2. Plugins ativos

Declarados em `.claude/settings.json` → `enabledPlugins`:

| Plugin                                         | Origem                                                       | Para que serve no Logos                                              |
|-----------------------------------------------|--------------------------------------------------------------|----------------------------------------------------------------------|
| `github@claude-plugins-official`              | Marketplace oficial                                          | MCP `mcp__github__*` para PRs, issues, code review                   |
| `vercel@claude-plugins-official`              | Marketplace oficial                                          | MCP `mcp__plugin_vercel_*`, skills `vercel:nextjs`, `vercel:deploy`, etc. |
| `supabase@claude-plugins-official`            | Marketplace oficial                                          | MCP `mcp__plugin_supabase_*`, skills `supabase:supabase`              |
| `typescript-lsp@claude-plugins-official`      | Marketplace oficial                                          | LSP para TypeScript (verificação de tipos no editor)                  |
| `commit-commands@claude-plugins-official`     | Marketplace oficial                                          | Slash commands `/commit-commands:commit`, `/commit-commands:commit-push-pr` |
| `frontend-design@claude-plugins-official`     | Marketplace oficial                                          | Skill para design de UIs polidas (V1+ páginas públicas)               |
| `engineering-skills@claude-code-skills`       | Marketplace `claude-code-skills` (`alirezarezvani/claude-skills`) | 23 skills de engenharia: TDD, code review, segurança, frontend, backend |

O marketplace `claude-code-skills` é declarado em `extraKnownMarketplaces` no mesmo ficheiro — assim, ao detectar o plugin em falta, o Claude Code já sabe onde o ir buscar sem intervenção manual.

---

## 3. Setup numa máquina nova (developer junior, ~10 minutos)

### Pré-requisitos

- **Node.js LTS** (20+) e **pnpm** instalados (ver `SPEC_1.md` §11)
- **Git** + **GitHub CLI** (`gh`) instalados e autenticados
- **Claude Code CLI** instalado: `npm i -g @anthropic-ai/claude-code` (ou via instalador nativo)
- **Conta Anthropic** configurada no Claude Code (`claude` → seguir prompt de login)

### Passos

1. **Clonar o repositório.**

   ```pwsh
   git clone https://github.com/jcrninja/logos.git
   cd logos
   ```

2. **Abrir o Claude Code na pasta do projeto.**

   ```pwsh
   claude
   ```

   Na primeira abertura, o Claude Code:
   - Lê `.claude/settings.json`
   - Detecta plugins não instalados nesta máquina
   - Pergunta se queres instalar — **responde `y`**
   - Instala os 7 plugins automaticamente (incluindo o marketplace `claude-code-skills` declarado)

3. **Autenticar serviços externos (uma vez por máquina).**

   Os tokens dos MCPs **nunca** ficam no repositório. Cada máquina autentica:

   ```pwsh
   gh auth login                    # GitHub MCP usa o token do gh
   ```

   Para Vercel e Supabase MCP, a autenticação é feita pelos próprios plugins na primeira utilização — o Claude Code abre o browser para OAuth quando uma ferramenta MCP é invocada.

4. **(Opcional) Configurar variáveis de ambiente locais.**

   ```pwsh
   Copy-Item .env.example .env.local
   ```

   Preencher com as credenciais Supabase de `logos-dev`, chaves Resend, etc. (não disponíveis ainda — fase de Setup, ver `status.md`).

5. **Verificar que está tudo a funcionar.**

   No Claude Code, escrever `/version-check` ou `/pr-ready` para confirmar que as slash commands carregaram. Em chat normal, perguntar `que plugins tenho ativos?` — deve listar os 7.

---

## 4. O que NÃO é partilhado entre máquinas

- **`.claude/settings.local.json`** — gitignored. Permissões adicionais que cada developer concede em runtime ficam aqui. Se quiseres promover uma para partilhada, mover manualmente para `.claude/settings.json`.
- **Tokens de auth dos MCPs** — Vercel, Supabase e GitHub guardam tokens cifrados localmente em `~/.claude/`. Cada máquina autentica separadamente.
- **Histórico, sessões, telemetria** — vivem em `~/.claude/sessions`, `~/.claude/history.jsonl`, etc. Locais por design.
- **Tema, tipo de letra, atalhos pessoais** — `~/.claude/settings.json` (global do utilizador, não do projeto).

---

## 5. Permissões partilhadas

`.claude/settings.json` → `permissions.allow` lista comandos seguros que dispensam prompts em **qualquer máquina**:

- **pnpm:** `install`, `dev`, `build`, `lint`, `test`, `format`, `add`, `remove`, `update`, `dlx`, `exec`
- **shadcn/ui:** `npx shadcn*`
- **supabase CLI:** `migration`, `db push/diff`, `functions`, `gen types`, `link`, `start/stop`
- **vercel CLI:** `ls`, `env`, `link`, `pull`, `logs`, `inspect` (operações read-mostly)
- **git:** todas as operações comuns; **deny** para `--force`, `reset --hard`, `clean -f`
- **gh:** `auth`, `pr`, `repo view`, `issue`, `workflow`, `run`, `api`

`permissions.deny` bloqueia operações destrutivas mesmo se o utilizador as tentar autorizar interactivamente:

- `rm -rf *`
- `git push --force` em qualquer forma
- `git reset --hard`
- `supabase projects delete`, `vercel remove`, `gh repo delete`
- `git branch -D *main*` (proteção do branch principal)

> **Pelo CLAUDE.md:** push directo para `main` é proibido. A combinação `permissions.deny` + branch protection no GitHub torna essa regra exequível e não apenas convencional.

---

## 6. Atualizar plugins

Os plugins seguem o repo do marketplace, não um *registry* com semver. Para atualizar:

```text
/plugin update <plugin-name>
```

Ou todos de uma vez:

```text
/plugin update --all
```

Se uma versão nova partir comportamento, fixa-se a versão temporariamente em `.claude/settings.json`:

```json
"vercel@claude-plugins-official": "0.40.1"
```

(em vez de `true`). Não está fixado por defeito — preferir o comportamento mais recente até houver problema concreto.

---

## 7. Adicionar um plugin novo

1. **Instalar** localmente: `/plugin install <nome>`
2. **Confirmar** que aparece em `~/.claude/plugins/installed_plugins.json`
3. **Adicionar** a entrada em `.claude/settings.json` → `enabledPlugins` (com `true`)
4. Se vier de marketplace não-oficial, **adicionar** em `extraKnownMarketplaces`
5. **Commit + PR** — outras máquinas vão receber o plugin na próxima vez que abrirem o repo

---

## 8. Histórico

- **05-05-2026** — `.claude/settings.json` partilhado criado com 7 plugins, marketplace `claude-code-skills`, permissões `allow`/`deny` e modelo `opus`. Sub-agents e slash commands já estavam versionados (04-05-2026).
