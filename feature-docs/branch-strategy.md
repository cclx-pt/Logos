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
- **`v2.5-copy-ux`** — `main` + dois commits V2.5: copy & UX do ministério (hero LOGOS, lema em itálico, carrossel de testemunhos placeholder, `/conteudos` flat, `/perfil`, dropdown user expandido) + fix 404 Base UI. **Espera por:** testemunhos finais do ministério. *(Update 20-05-2026 — V2.5 já não merga em `main` separadamente: `v3-cursos` carrega os commits V2.5 e tudo sobe numa só PR no dia do lançamento; ver §1.2.)*
- **`v3-cursos`** — `v2.5-copy-ux` + commits V3 (plano + PR1-PR8 + PR9a Analytics). **Fechada dev-side em 20-05-2026** (PR9b Playwright E2E adiada para V3.1). Não mergea em `main` até 01-07-2026.

### Promoções esperadas — plano actual (20-05-2026)

V3 fechada dev-side, V2.5 ainda à espera de testemunhos do ministério. Em vez do plano original de 2 promoções, hoje **a promoção é única** porque `v3-cursos` já carrega os commits V2.5:

```
hoje                                              dia do lançamento
─────────────────────────────────────────────────┬──────────────►
                                                 │
main = V2 ──────────────────────────────────►   main = V2.5 + V3
v3-cursos (contém V2.5 + V3) ──single PR────►   (apagar branch)
v2.5-copy-ux ───absorvida em v3-cursos────────  (apagar branch)
```

**Promoção única (V2 → V2.5 + V3):** quando ministério mandar testemunhos finais.
1. (Em `v3-cursos`) Substituir os 5 placeholders do carrossel pelos testemunhos reais. Commit + push.
2. Aplicar migrations V3 a `logos-prod` na ordem por timestamp.
3. Confirmar bucket `lesson-pdfs` em `logos-prod` (criado pela migration `20260519020000`).
4. Abrir PR `v3-cursos` → `main`.
5. CI verde + smoke test manual + merge.
6. Apagar `v3-cursos` e `v2.5-copy-ux` no GitHub.

### Plano original (preservado para contexto histórico)

O plano de 19-05-2026 era promover em duas fases: V2.5 → `main` quando testemunhos chegarem, depois rebase de `v3-cursos` em cima da nova `main` e promover V3 mais tarde. Tornou-se redundante quando V3 fechou (20-05-2026) antes da V2.5 desbloquear — fazer dois merges com a mesma base é mais trabalho do que um. O "Promoções esperadas — plano actual" acima é o que se vai executar.

## 2. Regras duras

Estas regras existem para que não acidentemente subamos V3 incompleta à Production.

- **Nunca push directo para `main`.** Sempre via PR (já garantido por branch protection — ver `SPEC_1.md` §16 e `feature-docs/ci.md`).
- **Nunca mergear PR de feature de V3 directamente em `main`.** Todas as PRs de V3 são internas (mergeadas via fast-forward / squash em `v3-cursos`).
- **Nunca aplicar migrations V3 a `logos-prod` antes do dia do lançamento.** `logos-prod` continua com o schema V2 até 01-07-2026. Migrations V3 ficam apenas em `logos-dev` durante todo o desenvolvimento V3.
- ~~A branch `v3-cursos` pode ser rebasada em `main` quando V2.5 mergear~~ — **obsoleto:** V2.5 já não merga separadamente (absorvida em `v3-cursos`).
- **Vercel previews automáticos** — qualquer push para `v2.5-copy-ux` ou `v3-cursos` cria um Preview deploy contra `logos-dev`. Production só é tocada por merges em `main`.

## 3. Testar V3 noutros dispositivos

> **Cenário:** queres validar V3 do telemóvel, tablet, outro portátil — sem precisar do código local.

### URLs estáveis (apontam sempre ao último commit da branch)

| Camada | URL stable | Per-deploy (imutável, por hash) |
|---|---|---|
| Production | `https://logos.cclx.pt/` | `https://logos-<hash>.vercel.app/` |
| V2.5 preview | `https://logos-git-v2.5-copy-ux-jcrninjas-projects.vercel.app/` | `https://logos-mh9qlw9ok-jcrninjas-projects.vercel.app/` (último em 19-05) |
| V3 preview | `https://logos-git-v3-cursos-jcrninjas-projects.vercel.app/` | per-deploy hash muda a cada push — usar `vercel ls` |

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
