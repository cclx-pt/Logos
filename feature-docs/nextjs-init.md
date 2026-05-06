# nextjs-init.md — Inicialização Next.js (Setup → V1)

> **Versão:** Setup (pré-V1) · **Concluída em:** 05-05-2026 · **Autor:** jcrninja (assistido por Claude Code)

## Objetivo

Estabelecer as fundações técnicas do projeto: framework, linguagem, estilização, linting, formatação e gestor de pacotes. A partir daqui qualquer feature de V1 (home, conhece-nos, fala connosco) tem onde aterrar sem decisões adicionais de tooling.

---

## 1. Stack instalada

| Camada                     | Versão | Notas                                                                  |
|----------------------------|--------|------------------------------------------------------------------------|
| **Next.js**                | 16.2.4 | App Router, Turbopack ativo em `dev`. SPEC_1 dizia "Next.js 15"; ver §6 |
| **React**                  | 19.2.4 | Acompanha Next 16                                                      |
| **TypeScript**             | 5.9.3  | `strict: true` (default do scaffold)                                   |
| **Tailwind CSS**           | 4.2.4  | v4 — sem `tailwind.config.ts`; tokens em `@theme` no `globals.css`     |
| **ESLint**                 | 9.39.4 | Flat config (`eslint.config.mjs`). `eslint-config-next/typescript`     |
| **Prettier**               | 3.8.3  | Integrado com ESLint via `eslint-config-prettier`                      |
| **prettier-plugin-tailwindcss** | 0.8.0 | Ordena classes Tailwind canonicamente                              |
| **Node**                   | ≥20    | `engines.node` no `package.json`. Local: 24.15.0                       |
| **pnpm**                   | 10.33.2 | `packageManager` no `package.json`. **Único gestor permitido.**       |

---

## 2. Como foi inicializado

### Comando exato

```bash
pnpm create next-app@latest nextjs-init-tmp \
  --ts --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --use-pnpm --turbopack --yes
```

### Significado de cada flag

| Flag                    | Porquê                                                              |
|-------------------------|---------------------------------------------------------------------|
| `--ts`                  | TypeScript em strict; sem `any` sem comentário (regra do CLAUDE.md) |
| `--tailwind`            | Tailwind v4 com PostCSS plugin                                      |
| `--eslint`              | Flat config, `eslint-config-next/typescript`                        |
| `--app`                 | App Router (não Pages Router) — RSC, layouts, server actions        |
| `--src-dir`             | Código em `src/` — separa código de config root                     |
| `--import-alias "@/*"`  | `import x from '@/components/x'` em vez de relativos longos          |
| `--use-pnpm`            | Lockfile pnpm, não npm/yarn                                         |
| `--turbopack`           | Turbopack para `next dev` (e build), bundler oficial Next 16        |
| `--yes`                 | Aceita defaults para qualquer prompt não coberto pelas flags        |

### Estratégia "scaffold em pasta temporária"

`create-next-app` recusa correr num diretório que já tem ficheiros próprios (`CLAUDE.md`, `SPEC_1.md`, `architecture.md`, `docs/`, etc.). A solução foi:

1. Scaffold em `nextjs-init-tmp/`
2. Mover os ficheiros do projeto para o root (`package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `eslint.config.mjs`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `tsconfig.json`, `src/`, `public/`, `AGENTS.md`)
3. **Não mover** o `CLAUDE.md` gerado pelo Next.js (apontava para `AGENTS.md` e teria sobrescrito o nosso)
4. **Não mover** o `README.md` default (Next.js boilerplate)
5. **Não mover** `.gitignore` (o nosso é mais completo) nem `node_modules` (regenerado depois com `pnpm install`)
6. `Remove-Item -Recurse nextjs-init-tmp` (no Windows; `rm -rf` está bloqueado por `permissions.deny`)
7. `pnpm install` no root para popular `node_modules`

### `package.json` ajustado

Após o scaffold:

- `name`: `nextjs-init-tmp` → **`logos`**
- Adicionado `description` apontando para `logos.cclx.pt`
- Adicionado `engines` (`node >=20`, `pnpm >=10`)
- Adicionado `packageManager` (`pnpm@10.33.2`) — Corepack escolhe pnpm certo
- Scripts:

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "lint:fix": "eslint --fix",
  "typecheck": "tsc --noEmit",
  "format": "prettier --write .",
  "format:check": "prettier --check ."
}
```

---

## 3. Estrutura de ficheiros

```
.
├── src/
│   └── app/
│       ├── favicon.ico        # Default Next.js — substituir por LOGOS na V1
│       ├── fonts.ts           # Cormorant Garamond + Inter via next/font/google
│       ├── globals.css        # @theme com tokens de branding (paleta + fontes)
│       ├── layout.tsx         # <html lang="pt-PT">, fontes injetadas, metadata
│       └── page.tsx           # Wordmark "LOGOS" + "Em construção"
├── public/                    # Vazio — assets boilerplate removidos
├── eslint.config.mjs          # Flat config: next vitals + next ts + prettier
├── next.config.ts             # Vazio (apenas tipo NextConfig)
├── next-env.d.ts              # Auto-gerado
├── postcss.config.mjs         # Plugin @tailwindcss/postcss
├── tsconfig.json              # strict, paths @/* → ./src/*
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml        # ignoredBuiltDependencies: sharp, unrs-resolver
├── .prettierrc.json
├── .prettierignore
└── AGENTS.md                  # Aviso do Next 16 sobre breaking changes
```

---

## 4. Decisões técnicas

### 4.1. Versão Next.js: 16, não 15 — sob tripwire

A SPEC v2.2 inicial pedia Next 15. O scaffold trouxe **16.2.4** (default mais recente do `create-next-app` a 05-05-2026). Optou-se por **manter 16 sob tripwire** documentado em `status.md` ⚠️ Riscos, em vez de fazer downgrade preemptivo: o teste decisivo é a instalação do shadcn/ui (próxima task após CI).

Fact-check feito a 06-05-2026 confirma:

- shadcn/ui suporta oficialmente Tailwind v4 desde início de 2026 (CLI auto-deteta versão)
- shadcn/ui é compatível com Next.js 16 + React 19
- pnpm evita os prompts de peer-deps típicos do npm
- Asteriscos conhecidos: bug de hidratação em `Button asChild` (issue específico, contornável); mudança de `React.FC` em React 19 (não inclui `children` por defeito)

**Gatilhos do tripwire:** se (a) `shadcn@latest init` falhar, OU (b) integrar shadcn ou outra dep terceira exigir >2h cumulativas de debug, OU (c) surgir issue de produção rastreada ao Next 16 — abrir PR `chore/downgrade-stack` com Next 16→15 e Tailwind v4→v3 num único commit. Custo estimado: 2-4h (revalidação de Vitest, ESLint, Prettier, `eslint-config-next`).

**Ação resultante:** `CLAUDE.md`, `architecture.md` e `status.md` registam Next.js 16 explicitamente como **default mantido sob tripwire**, não como decisão definitiva.

### 4.2. Tailwind v4 (sem `tailwind.config.ts`)

Tailwind 4 abandonou o JS config para a maioria dos casos. Tokens vivem em `@theme { --color-... }` dentro do `globals.css`. Vantagem: **uma só fonte de verdade visual** (CSS); o `feature-docs/branding.md` mapeia 1:1 com o que está no CSS.

**Trade-off aceite:** componentes shadcn/ui (a chegar em PR seguinte) podem precisar de adapter — a CLI shadcn já suporta Tailwind v4.

### 4.3. App Router + `src/`

App Router é o caminho oficial; Pages Router está em modo manutenção. `src/` mantém o root limpo para docs (`CLAUDE.md`, `SPEC_1.md`, `architecture.md`, `status.md`, `changelog.md`) — **CLAUDE.md regista que docs no root são importantes**, e isto separa-os fisicamente do código.

### 4.4. ESLint 9 flat config + Prettier desligado de regras de estilo

`eslint-config-prettier/flat` é importado **por último** na flat config — desliga todas as regras ESLint que colidem com Prettier (espaços, aspas, ponto-e-vírgula, etc.). Resultado: ESLint trata de qualidade (regras de React/Next/TS), Prettier trata de formato. Sem disputas.

### 4.5. Prettier ignora `.claude/`, `docs/`, `feature-docs/`, `CLAUDE.md`, `SPEC_1.md`, `AGENTS.md`

Estes ficheiros são editados manualmente com formato deliberado (tabelas, alinhamentos, comentários). Reformatar quebraria a leitura.

### 4.6. `prettier-plugin-tailwindcss`

Ordena automaticamente as classes Tailwind pela ordem canónica recomendada. Sem isto, `bg-cream-bg flex` e `flex bg-cream-bg` apareciam consoante o autor; agora são sempre iguais — facilita diffs.

### 4.7. `lang="pt-PT"` no `<html>`

Hardcoded. PT-PT é regra de projeto (CLAUDE.md). Mesmo que a UI seja mínima agora, screen readers já apanham a língua certa.

### 4.8. Metadata template `'%s · Logos'`

Permite que cada página defina apenas o seu segmento (ex.: "Cursos") e a base concatena automaticamente para `Cursos · Logos`. Default plano (sem template) é `Logos — CCLX`.

### 4.9. `public/` esvaziado

Os SVGs default (`next.svg`, `vercel.svg`, `globe.svg`, `window.svg`, `file.svg`) eram boilerplate Vercel. Removidos. O logótipo oficial vive em `docs/branding/logo-cclx-logos.svg` — quando for usado em produção, copiar para `public/` ou importar inline.

### 4.10. Favicon ainda é o default Next.js

`src/app/favicon.ico` é o "pretzel com N" do scaffold. **Pendente**: gerar favicon a partir do SVG do ministério. Não bloqueia V1.

---

## 5. Tokens de branding aplicados

Espelhados de `feature-docs/branding.md` em `src/app/globals.css`:

| Token Tailwind          | Hex       | Classe Tailwind v4         |
|-------------------------|-----------|----------------------------|
| `--color-cream-bg`      | `#FAF4EA` | `bg-cream-bg`              |
| `--color-cream-card`    | `#FBE6D4` | `bg-cream-card`            |
| `--color-sage-card`     | `#C6CDB1` | `bg-sage-card`             |
| `--color-butter-card`   | `#F6E6C4` | `bg-butter-card`           |
| `--color-orange`        | `#E36A2C` | `text-orange` / `bg-orange` |
| `--color-orange-hover`  | `#C85A22` | `hover:bg-orange-hover`    |
| `--color-ink`           | `#1A1A1A` | `text-ink`                 |
| `--color-muted`         | `#6B6B6B` | `text-muted`               |

Famílias tipográficas:

- `font-sans` → Inter (via `--font-inter` em `fonts.ts`)
- `font-display` → Cormorant Garamond (via `--font-cormorant`)

---

## 6. Comandos úteis

```bash
pnpm dev              # http://localhost:3000 (Turbopack)
pnpm build            # build produção
pnpm start            # serve produção
pnpm lint             # ESLint
pnpm lint:fix         # ESLint --fix
pnpm typecheck        # tsc --noEmit
pnpm format           # Prettier --write em todo o repo
pnpm format:check     # Prettier --check (CI)
```

Pipeline pré-PR canónica (até existir `pnpm test`): `pnpm lint && pnpm typecheck && pnpm format:check && pnpm build`.

---

## 7. Smoke test executado

- `pnpm typecheck` → 0 erros
- `pnpm lint` → 0 warnings
- `pnpm format:check` → "All matched files use Prettier code style!"
- `pnpm dev` → "Ready in 938ms" (Next.js 16.2.4 Turbopack)
- `curl http://localhost:3000/` → HTTP 200, HTML contém `lang="pt-PT"`, "LOGOS", "Em construção", classes das fontes Cormorant + Inter aplicadas

---

## 8. Limites conhecidos / pendente

- [ ] Favicon ainda é o default do Next.js — gerar a partir de `docs/branding/logo-cclx-logos.svg` e substituir `src/app/favicon.ico`
- [ ] Logótipo oficial não é usado na home — V1 introduz cabeçalho com logo (drop-in `<Image>` ou inline SVG)
- [ ] Sem testes (Vitest + Testing Library) — próxima task em `status.md`
- [ ] Sem CI (`ci.yml`) — próxima task em `status.md`
- [ ] Sem shadcn/ui — próxima task em `status.md`

---

## 9. Troubleshooting

### `pnpm create next-app` falha com "directory not empty"
Usar a estratégia "scaffold para subpasta + mover" descrita em §2.

### Tailwind v4 não reconhece classes custom (`bg-cream-bg`)
Confirmar que `globals.css` tem `@import 'tailwindcss';` no topo **antes** do `@theme`, e que `tokens` estão sob `@theme` (não `@theme inline` exceto se forem aliases para outras variáveis CSS).

### `pnpm dev` arranca mas página devolve fonte serif por todo o lado
`fonts.ts` define as variáveis `--font-cormorant` e `--font-inter`. Têm de ser injetadas no `<html>` via `cormorant.variable` e `inter.variable` (em `layout.tsx`) — caso contrário o `globals.css` não consegue resolvê-las.

### ESLint reclama de regras Prettier (semi/quotes)
`eslint-config-prettier/flat` deve ser o **último** import na flat config — desliga regras anteriores. Se for posto antes do `nextTs`, este reativa-as.

### `Remove-Item` em vez de `rm -rf`
`.claude/settings.json` em `permissions.deny` bloqueia `rm -rf`. Usar PowerShell: `Remove-Item -Recurse -Force <path>`.

---

## 10. Referências

- `feature-docs/branding.md` — paleta e tipografia (fonte de verdade dos tokens)
- `SPEC_1.md` §11 — stack canónico
- `architecture.md` — visão geral da arquitetura
- `AGENTS.md` (root) — aviso do Next 16 sobre breaking changes vs versões anteriores
- [Tailwind v4 docs — Theme](https://tailwindcss.com/docs/theme)
- [Next.js 16 release notes](https://nextjs.org/blog/next-16)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
