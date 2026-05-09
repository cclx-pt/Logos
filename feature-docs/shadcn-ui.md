# shadcn-ui — Componentes UI

> **Versão:** Setup (pré-V1) · **Concluída em:** 09-05-2026 · **Estado:** scaffold instalado; componentes específicos vêm conforme necessários por versão

## 1. Objetivo

Disponibilizar uma base de componentes acessíveis (Radix-equivalent via Base UI), composíveis e adaptados à paleta CCLX, sem instalar uma biblioteca pesada. shadcn/ui copia código-fonte dos componentes para o repositório — nada fica em `node_modules` opaco.

## 2. Comando usado

```bash
pnpm dlx shadcn@latest init -d
```

`-d` (defaults) é obrigatório para correr non-interactive — `-y` sozinho não chega (continuaria a perguntar pela primitive library). O CLI v4 deprecou as flags `--style`, `--base-color`, `--src-dir`, `--no-base-style` e `--css-variables`; configura-se em `components.json` depois.

O init:

1. Detetou Next.js + Tailwind v4 + alias `@/*` automaticamente.
2. Criou `components.json`.
3. Instalou dependências: `@base-ui/react`, `class-variance-authority`, `clsx`, `lucide-react`, `tailwind-merge`, `tw-animate-css`, `shadcn` (package que disponibiliza `@import "shadcn/tailwind.css"` em `globals.css`).
4. Criou `src/lib/utils.ts` (helper `cn()`).
5. Criou `src/components/ui/button.tsx` (componente smoke incluído no scaffold).
6. Reescreveu `src/app/globals.css` para acrescentar tokens semânticos shadcn em `:root` + `@theme inline` + `.dark`.
7. Tentou reescrever `src/app/layout.tsx` para introduzir Geist como `--font-sans` (revertido — ver §6 Gotchas).

## 3. Configuração final (`components.json`)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "base-nova",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "stone",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "rtl": false,
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "menuColor": "default",
  "menuAccent": "subtle",
  "registries": {}
}
```

### Decisões

- **`style: "base-nova"`** — novo default em CLI v4 (substitui `new-york` para projetos novos baseados em Base UI). Mantido por ser o padrão atual; alinhar com o registry oficial reduz fricção em futuros `add`.
- **`baseColor: "stone"`** — alterado de `"neutral"` (default) para `"stone"`, que é mais quente e aproxima-se do tom creme da paleta CCLX. Pouco impacto prático porque vamos sobrescrever todos os tokens com hex CCLX, mas se um dia regenerarmos defaults o resultado fica menos frio.
- **Base UI vs Radix UI:** o init de CLI v4 escolheu Base UI por defeito (vê-se no `import { Button as ButtonPrimitive } from "@base-ui/react/button"`). Radix continua suportado via `--base radix`. **Não vamos usar AI Elements**, que tem incompatibilidades com Base UI; logo, Base UI é seguro para o Logos.
- **`iconLibrary: "lucide"`** — `lucide-react` instalado. Alinha com `feature-docs/branding.md` §6.

## 4. Mapeamento de tokens CCLX → shadcn

A paleta CCLX (8 hex em `feature-docs/branding.md` §1) é a **fonte de verdade**. Os tokens semânticos shadcn (`--background`, `--primary`, etc.) são uma camada de tradução que vive em `src/app/globals.css`.

| Token shadcn | Valor (hex) | Token CCLX subjacente |
|---|---|---|
| `--background` | `#faf4ea` | `cream-bg` |
| `--foreground` | `#1a1a1a` | `ink` |
| `--card` | `#fbe6d4` | `cream-card` (default; cards específicos podem usar `sage-card`/`butter-card` por classe) |
| `--card-foreground` | `#1a1a1a` | `ink` |
| `--popover` | `#faf4ea` | `cream-bg` |
| `--popover-foreground` | `#1a1a1a` | `ink` |
| `--primary` | `#e36a2c` | `orange-primary` |
| `--primary-foreground` | `#ffffff` | branco para contraste em CTAs laranja |
| `--secondary` | `#f6e6c4` | `butter-card` |
| `--secondary-foreground` | `#1a1a1a` | `ink` |
| `--muted` | `#f4ead8` | mid-cream entre `cream-bg` e `cream-card` (a refinar visualmente) |
| `--muted-foreground` | `#6b6b6b` | `muted` |
| `--accent` | `#c6cdb1` | `sage-card` |
| `--accent-foreground` | `#1a1a1a` | `ink` |
| `--destructive` | `#b3401a` | vermelho-laranja escuro alinhado com paleta quente (sem token CCLX nominal — apenas para erros) |
| `--border` | `#e5dcc7` | derivado de `cream-bg` (contorno suave) |
| `--input` | `#e5dcc7` | igual a `border` |
| `--ring` | `#e36a2c` | `orange-primary` |
| `--radius` | `0.625rem` | default shadcn — alinha com "cantos arredondados generosos" da §4 do branding |

### Tokens deixados em defaults shadcn (sem uso até versões posteriores)

- `--chart-1` a `--chart-5` — placeholders escala neutra; afinar quando V5 trouxer dashboards.
- `--sidebar*` — placeholders; afinar quando V3+ usar layout com barra lateral.
- `.dark { ... }` — toda a secção é defaults shadcn em escala neutra. Dark mode chega na V6 com paleta CCLX nocturna desenhada de raiz; até lá, o bloco `.dark` é placeholder.

### Tokens de tipografia

- `@theme { --font-sans: var(--font-inter), ... }` — Inter para UI/corpo.
- `@theme { --font-display: var(--font-cormorant), ... }` — Cormorant Garamond para títulos.
- `@theme inline { --font-heading: var(--font-display) }` — componentes shadcn que usam `font-heading` (p.ex. `CardTitle` em `new-york`-style) renderizam com Cormorant. **Não usar `var(--font-sans)` em `@theme inline`** (gotcha — ver §6).

## 5. Componentes

### Atualmente instalados

- `Button` (`src/components/ui/button.tsx`) — incluído no scaffold do CLI v4. Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`. Sizes: `xs`, `sm`, `default` (h-8), `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`. Usa Base UI (`@base-ui/react/button`). Não está usado em produção ainda — ficará em uso na V1 (página "Fala connosco" + V2 auth).

### Roadmap por versão

A regra é **instalar conforme se precisa**. Não copiar componentes "para ter".

- **V1** (público estático): `card`, `input`, `textarea`, `label`, `form` — para a página "Fala connosco" e composição da home/conhece-nos.
- **V2** (auth + papéis + fundação de etiquetas): `dropdown-menu`, `avatar`, `dialog`, `alert`, `separator`, `badge`. UI de promoção de papéis precisa de `dialog` ou `alert-dialog` (destrutivo).
- **V3** (cursos/módulos/aulas + restrição por curso): `accordion` (módulos colapsáveis), `skeleton` (loading), `scroll-area` (lista de aulas em sidebar). **Sem `progress`** — barras de progresso estão proibidas até V7 por regra dura de `CLAUDE.md`.
- **V4+** — conforme aparecerem necessidades.

## 6. Gotchas conhecidos

### 6.1 `shadcn init` corrompeu `layout.tsx`

O CLI introduziu Geist como nova fonte sans, ignorando o par Inter+Cormorant fixado:

```diff
+ import { Geist } from "next/font/google";
+ const geist = Geist({subsets:['latin'],variable:'--font-sans'});
- <html lang="pt-PT" className={`${cormorant.variable} ${inter.variable} h-full antialiased`}>
+ <html lang="pt-PT" className={cn("h-full", "antialiased", cormorant.variable, inter.variable, "font-sans", geist.variable)}>
```

**Revertido para a versão original**. Geist não está a ser usado e foi deixado como dep porque vem implícito noutros packages — se um dia o `pnpm prune` mostrar `next/font/google/Geist` órfão, podemos remover (mas nunca de `package.json` directamente — o package "next" inclui-o).

### 6.2 Circular self-reference em `--font-sans`

shadcn init escreveu em `@theme inline`:

```css
--font-sans: var(--font-sans);  /* circular — resolve para nada */
```

Tailwind v4 resolve `@theme inline` em **parse time**, não em runtime — logo `var(--font-inter)` injetado por Next.js via className não funcionaria aqui. A solução foi:

- Manter `--font-sans` em `@theme` (não inline) com `var(--font-inter), ui-sans-serif, ...` — funciona porque Tailwind processa o nome da família mas o navegador resolve `var(--font-inter)` em runtime.
- Remover o `--font-sans: var(--font-sans)` de `@theme inline`.
- Acrescentar `--font-heading: var(--font-display)` em `@theme inline` (sem circular reference porque `--font-display` está em `@theme` regular).

### 6.3 Prettier reformat após `add`

`shadcn add <componente>` traz código em **double quotes** (estilo do registry oficial). O Prettier do projeto usa **single quotes** (`.prettierrc.json`).

**Workflow recomendado após cada `add`**:

```bash
pnpm dlx shadcn@latest add <componente>
pnpm exec prettier --write src/components/ui/<componente>.tsx
```

`format:check` no CI vai detetar a inconsistência caso fique por fazer.

### 6.4 `format:check` local em Windows ainda lista 13 ficheiros

O `.gitattributes` instalado no PR de CI normaliza line endings em LF, mas o working tree em Windows mantém CRLF nos ficheiros pré-existentes até alguém correr `git add --renormalize . && git commit`. Em CI Linux passa. Dito doutra forma: ignorar warnings locais; o CI é o juiz.

## 7. Estrutura de ficheiros

```
src/
├── app/
│   └── globals.css         ← tokens CCLX + tokens semânticos shadcn + light/dark
├── components/
│   └── ui/
│       └── button.tsx      ← scaffold do init (CLI v4)
└── lib/
    └── utils.ts            ← cn() helper

components.json             ← config shadcn (style, baseColor, aliases)
package.json                ← + @base-ui/react, class-variance-authority, clsx, lucide-react, shadcn, tailwind-merge, tw-animate-css
```

A pasta `src/lib/` agora tem dois habitantes possíveis: `utils.ts` (não-identidade, helper genérico) e — quando V2 chegar — `auth/` (identidade, regra dura de `CLAUDE.md`). Não há colisão; a regra de `CLAUDE.md` é sobre `@supabase/ssr`, não sobre `src/lib/` em geral.

## 8. Limites conhecidos

- Nenhum componente está usado em página real. O smoke é apenas que tudo compila (`pnpm build` verde).
- Modo escuro continua placeholder (defaults shadcn neutros). Paleta CCLX nocturna fica para V6.
- `--muted: #f4ead8` foi um palpite — pode precisar de afinação visual quando V1 puser cards em produção.
- `--destructive: #b3401a` foi escolhido para alinhar com a paleta quente (em vez do vermelho default shadcn). Reavaliar se ficar visualmente fraco em mensagens de erro reais.

## 9. Referências

- [shadcn/ui CLI v4 docs](https://ui.shadcn.com/docs/cli) — comandos atualizados (`init -d`, deprecation de `--style`/`--base-color`).
- [shadcn/ui theming](https://ui.shadcn.com/docs/theming) — explicação de tokens em Tailwind v4.
- `feature-docs/branding.md` §1, §2, §6 — paleta CCLX, tipografia, decisões de tom.
- `SPEC_1.md` §11 — stack técnica (shadcn/ui listado).
- `CLAUDE.md` — regra "Privilegiar a opção aborrecida e bem-documentada" (porquê manter `base-nova` em vez de inventar style custom).
