# vercel — Bootstrap de deploy e env vars

> **Versão:** Setup (pré-V1) · **Concluída em:** 12-05-2026 · **Estado:** projeto `logos` criado em `jcrninjas-projects`, ligado a `cclx-pt/Logos`, env vars configuradas para os 3 scopes, domínio `logos.cclx.pt` activo em Production

## 1. Objetivo

Provisionar o Vercel como host de produção e Preview do Logos, com **deploy automático** a partir do GitHub (push em `main` → Production, PRs → Preview com URL único) e **env vars separadas por ambiente** (Production / Preview / Development).

## 2. Recursos provisionados

| Recurso | Identidade | Notas |
|---|---|---|
| Vercel team scope | `jcrninjas-projects` | Conta pessoal criada via *Sign in with GitHub*. CCLX **não** tem Vercel team próprio — adiar até justificar Vercel Pro (~20€/mês/membro) |
| Projeto Vercel | `logos` (`prj_V0Kp9TZj5QHdAkwBMoPenKlA1TJj`) | Framework auto-detectado: Next.js. Install/build resolvidos via `packageManager: pnpm@10.33.2` em `package.json` |
| GitHub repo | `cclx-pt/Logos` (**público**) | Org `cclx-pt` é dona; repo passou de privado a público em 12-05-2026 (ver §5) |
| Vercel GitHub App | Instalado em `cclx-pt` org | Acesso "Only select repositories" → `Logos`. Sem acesso a outros repos da org |

O ficheiro `.vercel/project.json` (gerado por `vercel link`) está em `.gitignore` — contém o `projectId` e `orgId` que ligam o working tree ao projeto Vercel mas não devem entrar no repo.

## 3. Ligação GitHub ↔ Vercel

- `push origin main` → Production deploy (URL: `logos-<hash>.vercel.app` até DNS estar configurado; `logos.cclx.pt` após CNAME)
- Abertura/atualização de PR → Preview deploy com URL único por commit
- Vercel comenta no PR com o Preview URL e o estado do build

O Vercel descobre os PRs via webhook do GitHub instalado pelo App.

## 4. Env vars por scope

Configuradas via `vercel env add` (ver §7 para gotcha de CLI). Estado em 12-05-2026:

### Production *(deploys de `main`)*

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | `Logos` |

**Supabase prod env vars deliberadamente unset.** V1 é estático (sem código Supabase). Quando V2 chegar, adicionar `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` a partir do painel `logos-prod` **antes** do merge — checkpoint explícito documentado em `status.md` próximas tarefas V2.

### Preview *(todos os PRs)*

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | `Logos` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dknrnqyqlojvnhspwjrd.supabase.co` (logos-dev) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_*` (logos-dev) |

**Preview aponta para `logos-dev`, não para `logos-prod`.** Decisão tomada em 09-05-2026 em `feature-docs/supabase.md` (PR #12) e formalizada na SPEC em 12-05-2026 (`SPEC_1.md` §13.5 atualizada). Razões:

- **Segurança de mutação**: PRs incluem schema migrations e mutações de teste. Não devem poluir `logos-prod` com utilizadores fictícios, conclusões fictícias, PDFs de teste.
- **Schema testing**: V3 terá schemas em evolução; Preview tem de correr contra DB onde migrations destrutivas são aceitáveis.
- **Auth testing**: V2 sign-ins Google durante teste de PR vão para `logos-dev`, não para a `auth.users` de produção.
- **Custo**: zero — ambos os projetos são free tier.
- **Trade-off aceite**: PRs não apanham bugs "production-only state" (formato real de dados reais). Apanha-se em QA manual pós-merge ou via Production Preview deploys ad-hoc.

### Development *(`vercel env pull` para `.env.development.local`)*

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_NAME` | `Logos` |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dknrnqyqlojvnhspwjrd.supabase.co` (logos-dev) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_*` (logos-dev) |

Estes valores espelham o `.env.local` do dev local (que é mantido manualmente e gitignorado). O scope Development do Vercel é só para `vercel env pull` — útil quando alguém clona o repo e quer popular o `.env.development.local` automaticamente.

### `NEXT_PUBLIC_SITE_URL` em Production e Preview

**Unset.** O Vercel preenche `VERCEL_URL` automaticamente em runtime; o código pode compor `https://${process.env.VERCEL_URL}` quando precisar de URL absoluto. Quando DNS estiver pronto, set `NEXT_PUBLIC_SITE_URL=https://logos.cclx.pt` no scope Production. Tarefa pendente em `status.md`.

## 5. Por que o repo é público

O Vercel Hobby (free) tem uma restrição específica:

| Dono do repo | Visibilidade | Suporte Hobby |
|---|---|---|
| Conta pessoal | Privado | ✅ |
| Conta pessoal | Público | ✅ |
| Organização | Público | ✅ |
| **Organização** | **Privado** | ❌ requer Pro (~20€/mês) |

O repo está em `cclx-pt` (org, por decisão de propriedade: igreja é dona do código, bus factor protegido). Para manter 0€/mês obrigatório por `SPEC_1.md §11`, o repo passou para **público** em 12-05-2026.

**Verificação de segurança feita antes da mudança de visibilidade:**

- Nenhum `.env`, `.env.local`, `.env.production` foi alguma vez commitado (verificado via `git log --all --full-history --diff-filter=A -- .env*`).
- Refs Supabase (`dknrnqyqlojvnhspwjrd`, `tirzriuabfwzqxtjsmfb`) em commits e docs são identificadores públicos por design (compõem o URL público `<ref>.supabase.co`); não dão acesso por si só.
- A *publishable key* (`sb_publishable_*`) é desenhada para exposição client-side; RLS é a camada que protege dados. Vive apenas em `.env.local` (gitignorado).
- A *service role key* (que bypassa RLS) nunca foi escrita em ficheiro versionado.

**Bónus**: ao passar o repo para público, **branch protection torna-se elegível** no plano gratuito do GitHub. `SPEC_1.md §16` e `feature-docs/ci.md` §1 foram revistos para refletir esta mudança. Activação da regra fica como tarefa próxima em `status.md`.

## 6. CLI: instalação e login

```bash
# Global, via npm (pnpm setup ainda não corrido nesta máquina)
npm i -g vercel

# Login (interactivo no browser uma vez)
vercel login   # escolher GitHub OAuth quando a conta foi criada com sign-in via GitHub
```

O token fica em `~/AppData/Local/com.vercel.cli/` (Windows) ou `~/.local/share/com.vercel.cli/` (Linux/macOS) e é reutilizado em todos os comandos seguintes.

## 7. Adicionar env vars via CLI — gotcha do Claude Code

O Vercel CLI v53 tem **auto-deteção de agent**: quando vê `CLAUDECODE=1` (ou outros sinais de Claude Code), entra em modo `--non-interactive` por defeito. Nesse modo, `vercel env add NAME preview --value V --yes` **falha** com `git_branch_required` — o CLI exige um terceiro positional explícito para "qual git branch dentro de Preview", mesmo passando `--yes`.

**Workaround** (validado a funcionar):

```bash
env -u CLAUDECODE vercel env add NAME preview "" --value "VALUE" --yes
```

- `env -u CLAUDECODE` desativa a deteção de agent só para este comando.
- `""` (string vazia) como terceiro positional = "todos os preview branches".
- `--value` evita prompt interactivo de valor (também evita problemas com stdin pipe).

Production e Development não têm este problema (não pedem git branch):

```bash
printf '%s' "VALUE" | vercel env add NAME production
printf '%s' "VALUE" | vercel env add NAME development
```

Listar tudo: `vercel env ls` (também funciona dentro de Claude Code sem ajustes).

## 8. Validar primeiro deploy

Após `git push` desta branch e abertura do PR:

1. Vercel detecta o push, inicia Preview build em ~10s.
2. Comenta no PR com o URL Preview.
3. Verificar `gh pr checks <PR>` — Preview do Vercel deve aparecer como check separado de `Lint · Typecheck · Test · Format`.
4. Abrir o URL Preview e confirmar que `LOGOS` + "Em construção" renderizam.

Se o build falhar, ler logs em:

```bash
vercel inspect <preview-url>
# ou
vercel logs <preview-url>
```

## 9. DNS (activo desde 12-05-2026)

Domínio Production: **`https://logos.cclx.pt`** (HTTPS auto-emitido por Let's Encrypt após validação).

Configuração no Hostinger (zona DNS de `cclx.pt`):

| Tipo | Nome | Valor | TTL |
|---|---|---|---|
| CNAME | `logos` | `00f4337193415fe7.vercel-dns-017.com` | 3600 |

> O Vercel agora emite um CNAME único por domínio (formato `<hash>.vercel-dns-NNN.com`) em vez do antigo `cname.vercel-dns.com`. O hash é estável enquanto o domínio estiver ligado ao mesmo projeto; se desligares e religares, recebes outro hash e tens de actualizar o Hostinger.

**Gotcha (consumido tempo):** antes de adicionar o CNAME foi preciso **remover** os registos A e AAAA pré-existentes no sub-domínio `logos` (Hostinger cria por defeito para parking page). O protocolo DNS proíbe CNAME + A/AAAA no mesmo nome — o Vercel marcaria *Invalid Configuration* até a limpeza acontecer. Lookup `Resolve-DnsName logos.cclx.pt -Server 1.1.1.1` é a forma rápida de confirmar antes de mexer no Vercel.

Adicionar o domínio é feito pelo dashboard Vercel (Project → Settings → Domains → Add). O equivalente CLI seria:

```bash
vercel domains add logos.cclx.pt
```

Após DNS válido, foi adicionado o env var de Production:

```bash
'https://logos.cclx.pt' | vercel env add NEXT_PUBLIC_SITE_URL production
```

E forçado um redeploy (`vercel redeploy <last-prod-url>`) porque `NEXT_PUBLIC_*` é inlined em build-time e o deploy anterior (do squash-merge do PR1) ainda não trazia o valor.

## 10. Pendente

- **Supabase prod env vars** em Production scope (V2 prerequisite, com checkpoint explícito antes do V2 merge)
- **Vercel Pro / team da CCLX** — reavaliar se o ministério crescer; hoje 0€/mês em personal scope é suficiente

## 11. Troubleshooting

### `Error: The repository "X" is private and owned by an organization, which is not supported on the Hobby plan.`

A regra do §5. Soluções:
1. Tornar repo público (escolhido — ver §5).
2. Mover repo de volta a conta pessoal.
3. Upgrade a Vercel Pro.

### `Failed to connect <repo> to project.`

Vercel GitHub App não está instalado no dono do repo ou não tem acesso a esse repo. Visitar `https://github.com/apps/vercel/installations/new`, escolher a org/conta certa, dar acesso ao repo específico.

### Preview deploy a usar Supabase errada

Verificar `vercel env ls` que o scope `Preview` aponta para `logos-dev`. Se algum env var apontar para `logos-prod` por engano, remover com `vercel env rm NAME preview` e adicionar a versão correcta.

### Build local diverge de Vercel build

Correr `vercel build` localmente para reproduzir o ambiente de build do Vercel. Diferenças típicas: env vars não em `.env.local`, versões de Node (Vercel usa 24 LTS), pnpm-lock desactualizado.

## 12. Referências

- `SPEC_1.md` §11 (stack), §12 (arquitetura), §13 (fluxo dev), §16 (branch protection)
- `architecture.md` §8 (deploy + ambientes), §10 (CI/CD)
- `feature-docs/supabase.md` §2 (projetos), §3 (env vars)
- `feature-docs/ci.md` §1 (branch protection)
- [Vercel CLI docs](https://vercel.com/docs/cli)
- [Vercel Hobby plan limits](https://vercel.com/docs/plans/hobby)
