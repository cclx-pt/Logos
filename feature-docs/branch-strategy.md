# Branch strategy — Logos

> **Fonte:** decisão tomada com o user em 19-05-2026 quando V2.5 entrou em hold à espera de testemunhos finais do ministério.
> **Estado:** activa até 01-07-2026 (lançamento V3). Reavaliar depois.

## 1. Modelo de 3 camadas

Em qualquer momento entre 19-05-2026 e 01-07-2026, o repositório vive em três camadas paralelas, cada uma com uma branch dedicada e um ambiente Vercel próprio.

| Camada | Branch | Ambiente Vercel | Quem vê |
|---|---|---|---|
| **Live** | `main` | Production (`logos.cclx.pt`) | Público + bots |
| **Stored** | `v2.5-copy-ux` | Preview (branch-stable URL) | Quem tiver login Vercel na conta do João |
| **Dev** | `v3-cursos` | Preview (branch-stable URL) | Quem tiver login Vercel na conta do João |

### O que cada camada contém

- **`main`** — V1 (shell público) + V2 (auth Google + papéis + área admin). Inclui o hub `/conteudos` (PR #32). **Não inclui** o copy final do ministério para o home/hero, lema, carrossel, `/perfil`, ou `/conteudos` flat — isso é V2.5.
- **`v2.5-copy-ux`** — `main` + dois commits V2.5: copy & UX do ministério (hero LOGOS, lema em itálico, carrossel de testemunhos placeholder, `/conteudos` flat, `/perfil`, dropdown user expandido) + fix 404 Base UI. **Espera por:** testemunhos finais + títulos provisórios dos cards de `/conteudos`. Quando esses textos chegarem, V2.5 mergea em `main` via PR e fica a Production.
- **`v3-cursos`** — `v2.5-copy-ux` + commits V3 (plano + PRs 1-9 conforme `feature-docs/v3-plan.md`). **Não mergea em `main` até 01-07-2026.** V3 é construída inteira aqui antes de subir.

### Promoções esperadas

```
hoje                     V2.5 ready                01-07-2026
─────────────────────────┬────────────────────────┬──────────────►
                         │                        │
main = V2 ────────────►  main = V2.5 ──────────►  main = V3
v2.5-copy-ux             v2.5-copy-ux ──merged─►  (apagar branch)
v3-cursos ───rebase em main, continuar V3 ───►   (apagar branch)
```

**Promoção 1 (V2 → V2.5):** quando ministério mandar testemunhos.
1. Abrir PR `v2.5-copy-ux` → `main`.
2. CI verde + merge (squash).
3. Apagar `v2.5-copy-ux` no GitHub.
4. **Rebase do `v3-cursos` em `main`** (substitui a base, é a mesma árvore — sem conflitos esperados).
5. `git push --force-with-lease origin v3-cursos`.

**Promoção 2 (V2.5 → V3):** dia do lançamento (01-07-2026).
1. Abrir PR `v3-cursos` → `main`.
2. CI verde + smoke test manual + merge (squash ou merge commit — preservar histórico de V3).
3. Apagar `v3-cursos`.
4. Aplicar migrations V3 a `logos-prod` na ordem por timestamp.
5. Bucket `lesson-pdfs` criado em `logos-prod` (se não foi feito antes via setup).

## 2. Regras duras

Estas regras existem para que não acidentemente subamos V3 incompleta à Production.

- **Nunca push directo para `main`.** Sempre via PR (já garantido por branch protection — ver `SPEC_1.md` §16 e `feature-docs/ci.md`).
- **Nunca mergear PR de feature de V3 directamente em `main`.** Todas as PRs de V3 são internas (mergeadas via fast-forward / squash em `v3-cursos`).
- **Nunca aplicar migrations V3 a `logos-prod` antes do dia do lançamento.** `logos-prod` continua com o schema V2 até 01-07-2026. Migrations V3 ficam apenas em `logos-dev` durante todo o desenvolvimento V3.
- **A branch `v3-cursos` pode ser rebasada em `main` quando V2.5 mergear** (operação técnica de housekeeping, não promoção).
- **Vercel previews automáticos** — qualquer push para `v2.5-copy-ux` ou `v3-cursos` cria um Preview deploy contra `logos-dev`. Production só é tocada por merges em `main`.

## 3. Testar V3 noutros dispositivos

> **Cenário:** queres validar V3 do telemóvel, tablet, outro portátil — sem precisar do código local.

### URLs estáveis (apontam sempre ao último commit da branch)

| Camada | URL stable | Per-deploy (imutável, por hash) |
|---|---|---|
| Production | `https://logos.cclx.pt/` | `https://logos-<hash>.vercel.app/` |
| V2.5 preview | `https://logos-git-v2.5-copy-ux-jcrninjas-projects.vercel.app/` | `https://logos-mh9qlw9ok-jcrninjas-projects.vercel.app/` (último em 19-05) |
| V3 preview | `https://logos-git-v3-cursos-jcrninjas-projects.vercel.app/` | `https://logos-jr1xogh3h-jcrninjas-projects.vercel.app/` (commit V3 PR1) |

**Como obter o URL per-deploy mais recente:**

```bash
pnpm dlx vercel ls --meta githubCommitRef=v3-cursos | head
```

(Substituir branch consoante a camada. Linha do topo é a mais recente.)

### Login Vercel para abrir o preview

1. No dispositivo novo, navegar para o URL do preview (qualquer um dos dois — stable ou per-deploy).
2. Vercel mostra ecrã *Vercel Authentication*: "This deployment is protected".
3. Clicar em "Continue with GitHub".
4. Entrar com a conta do João — `joaocanelasribeiro@gmail.com` (a conta GitHub `cclx-pt` está associada).
5. Vercel injecta um cookie de sessão e devolve para o preview real.

> A protecção é por **deployment scope** (jcrninjas-projects). Qualquer um com login na conta passa.

### Testar Auth (Google OAuth) no preview

- O preview corre contra `logos-dev` (Supabase project ref `dknrnqyqlojvnhspwjrd`).
- O OAuth callback do Supabase só permite a Site URL `https://logos.cclx.pt/` e a Redirect URL `http://localhost:3000/**` por defeito. Para os Vercel previews, **adicionar** o pattern `https://logos-*-jcrninjas-projects.vercel.app/**` nas Redirect URLs do `logos-dev` (Supabase Dashboard → Authentication → URL Configuration). Isto está documentado em `feature-docs/google-oauth-setup.md`.
- Se Auth falhar com "URL not allowed", verificar essa lista.

### Testar mudanças de schema (migrations V3)

- Migrations V3 vivem em `supabase/migrations/`, todas aplicadas a `logos-dev` mas **não** a `logos-prod`.
- O preview lê de `logos-dev`, por isso tens schema V3 completo no preview.
- Production em `logos.cclx.pt` continua a ler de `logos-prod` (schema V2 puro), por isso não há risco de uma migration partir o que está live.

## 4. Workflow diário em V3

1. Trabalhar em `v3-cursos` no dispositivo local.
2. `pnpm test`, `pnpm lint --max-warnings 0`, `pnpm typecheck`, `pnpm format:check` antes de comitar.
3. Comitar e fazer push para `origin/v3-cursos`.
4. Vercel cria preview automático (1-2 min).
5. Validar preview em desktop e mobile via URLs acima.
6. Quando uma PR V3 (PR1-PR9) estiver completa, abrir PR `v3-cursos` (sem destino — fica `v3-cursos` → `v3-cursos`, apenas para revisão pessoal; ou simplesmente continuar a comitar sem PR formal, dado que somos single dev). **Não abrir PR contra `main` até 01-07-2026.**

## 5. Quando esta doc deixa de servir

- Após 01-07-2026 e merge de V3 em `main`, o modelo de 3 camadas colapsa de volta para 1 (só `main` em Production + branches de feature curtas).
- Esta doc pode ser arquivada (mover para `docs/historico/` ou similar) com nota a explicar que era um estado de transição.
