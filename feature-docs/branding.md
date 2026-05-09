# branding.md — Identidade Visual da Logos

> **Estado:** ✅ Paleta + tipografia fixadas (05-05-2026). ✅ SVG do logótipo recebido (05-05-2026). ✅ Mapeamento shadcn aplicado (09-05-2026).
> **Fonte de verdade:** `SPEC_1.md` §14. Este documento aprofunda a aplicação técnica.

---

## 1. Paleta — tokens vinculativos

| Token            | Hex       | Tailwind / shadcn (sugerido) | Uso                                                  |
|------------------|-----------|------------------------------|------------------------------------------------------|
| `cream-bg`       | `#FAF4EA` | `--background`               | Fundo principal de todas as páginas                  |
| `cream-card`     | `#FBE6D4` | `--accent` / variação cartão | Cartão pêssego (variação 1)                          |
| `sage-card`      | `#C6CDB1` | variação cartão              | Cartão sálvia (variação 2)                           |
| `butter-card`    | `#F6E6C4` | variação cartão              | Cartão amarelo suave (variação 3)                    |
| `orange-primary` | `#E36A2C` | `--primary`                  | Marca, CTAs, links, ícones de destaque               |
| `orange-hover`   | `#C85A22` | `--primary` (estado hover)   | Hover/active de elementos `orange-primary`           |
| `ink`            | `#1A1A1A` | `--foreground`               | Texto principal                                      |
| `muted`          | `#6B6B6B` | `--muted-foreground`         | Texto secundário, *placeholders*, metadados          |

### Tokens em Tailwind v4 (`src/app/globals.css`)

A paleta vive directamente em `@theme` no `globals.css`. Tailwind v4 não usa `tailwind.config.ts` — os tokens são resolvidos a partir das CSS variables em parse time.

```css
@theme {
  /* Paleta CCLX — hex autoritativos */
  --color-cream-bg: #faf4ea;
  --color-cream-card: #fbe6d4;
  --color-sage-card: #c6cdb1;
  --color-butter-card: #f6e6c4;
  --color-orange: #e36a2c;
  --color-orange-hover: #c85a22;
  --color-ink: #1a1a1a;
  --color-muted: #6b6b6b;

  /* Tipografia */
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-cormorant), Georgia, serif;
}
```

Isto disponibiliza classes Tailwind como `bg-cream-bg`, `text-ink`, `text-orange`, `font-display`, etc.

### Mapeamento dos tokens semânticos shadcn

shadcn/ui (`new-york` / `base-nova`) consome tokens semânticos como `--background`, `--primary`, `--foreground`, etc. Em Tailwind v4 a tradução faz-se via `:root` (variáveis "CSS-puras") + `@theme inline` (que expõe `--color-*` para as classes Tailwind). Os hex CCLX são a fonte de verdade; estes tokens semânticos são apenas a camada de tradução.

```css
:root {
  --background: #faf4ea; /* cream-bg */
  --foreground: #1a1a1a; /* ink */
  --card: #fbe6d4; /* cream-card (default) */
  --card-foreground: #1a1a1a;
  --popover: #faf4ea;
  --popover-foreground: #1a1a1a;
  --primary: #e36a2c; /* orange-primary */
  --primary-foreground: #ffffff;
  --secondary: #f6e6c4; /* butter-card */
  --secondary-foreground: #1a1a1a;
  --muted: #f4ead8;
  --muted-foreground: #6b6b6b;
  --accent: #c6cdb1; /* sage-card */
  --accent-foreground: #1a1a1a;
  --destructive: #b3401a; /* alinhado com paleta quente */
  --border: #e5dcc7;
  --input: #e5dcc7;
  --ring: #e36a2c;
  --radius: 0.625rem;
  /* charts/sidebar — placeholders shadcn (sem uso até V3+/V5) */
}
```

E na `@theme inline` mapeiam-se para as classes Tailwind:

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  /* ...restantes tokens semânticos shadcn... */
  --font-heading: var(--font-display); /* Cormorant para headings em componentes shadcn */
}
```

> Os hex em `:root` são autoritativos. Quando precisar de afinar (p.ex. `--muted` parece demasiado claro contra cartões), atualiza-se em `globals.css` e em `feature-docs/shadcn-ui.md`. **Nunca inventar cores fora de §14.**

### Regras de uso

- **Fundo principal sempre `cream-bg`.** Branco puro (`#FFFFFF`) é proibido em superfícies grandes — partiria a coerência visual com o *placeholder* atual e os mockups.
- **Cartões alternam entre `cream-card`, `sage-card`, `butter-card`** para diversidade visual. Sem regra rígida de ordem; manter um relativo equilíbrio numa grelha.
- **`orange-primary` é raro.** Reservado a marca, CTAs, ícones de destaque e estado "ativo" da navegação. Ver mockup do cabeçalho: o link da página actual aparece a laranja com sublinhado.
- **`orange-hover` apenas em interação.** Nunca em estado de repouso.
- **Texto sobre cartões coloridos:** sempre `ink`. Não escurecer mais nem usar branco.

---

## 2. Tipografia — par fixado

### Fontes

- **Display / títulos: Cormorant Garamond** (Google Fonts)
  - Pesos a carregar: **500** (Medium), **600** (SemiBold)
  - Aplicado a: `h1`, `h2`, `h3`, hero, títulos de cartão de curso, wordmark *LOGOS* em texto
- **UI / corpo: Inter** (Google Fonts)
  - Pesos a carregar: **400** (Regular), **500** (Medium), **600** (SemiBold)
  - Aplicado a: `body`, navegação, formulários, botões, sidebars, metadados

### Carregamento (Next.js 16 App Router)

```ts
// app/fonts.ts
import { Cormorant_Garamond, Inter } from 'next/font/google';

export const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  display: 'swap',
  variable: '--font-cormorant',
});

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
});
```

```ts
// app/layout.tsx
<html lang="pt-PT" className={`${cormorant.variable} ${inter.variable}`}>
  <body className="font-sans bg-cream-bg text-ink">{children}</body>
</html>
```

```css
/* src/app/globals.css → @theme (Tailwind v4) */
@theme {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-cormorant), Georgia, serif;
}
```

Para componentes shadcn que usem `font-heading`, há também o mapeamento em `@theme inline`:

```css
@theme inline {
  --font-heading: var(--font-display);
}
```

### Escala tipográfica (orientativa)

| Uso             | Classe Tailwind            | Notas                              |
|-----------------|----------------------------|------------------------------------|
| Hero / `h1`     | `font-display text-5xl/[1.1] font-medium`   | Cormorant 500                      |
| `h2`            | `font-display text-3xl font-medium`         | Cormorant 500                      |
| `h3` / cartão   | `font-display text-2xl font-semibold`       | Cormorant 600                      |
| Corpo           | `font-sans text-base`                       | Inter 400                          |
| Botão           | `font-sans text-sm font-medium`             | Inter 500                          |
| Metadado        | `font-sans text-sm text-muted`              | Inter 400                          |

> Nada de `latin-ext`. O PT-PT vive no subset `latin`; carregar mais é desperdício de *bundle*.

---

## 3. Logótipo

### Estado

- **SVG oficial recebido (05-05-2026):** `docs/branding/logo-cclx-logos.svg` — wordmark "LOGOS" + livro aberto estilizado a linha laranja, viewBox `1600×913`, 452 paths.
- **Em falta:** variante **monocroma** para fundos escuros (V6).

### Fallback de texto (já não necessário)

Foi mantido como referência caso o SVG falhe a carregar. Renderizar o wordmark em texto:

```tsx
<Link href="/" className="font-display text-2xl font-semibold text-orange tracking-wide">
  LOGOS
</Link>
```

A partir da V1, usar diretamente o SVG (inline ou via `next/image`) e manter o texto como `aria-label` para acessibilidade.

### Regras de uso do SVG

- Manter altura mínima de 32px em mobile, 40px em desktop.
- Espaço livre à volta ≥ metade da altura do logótipo.
- Não distorcer, não rodar, não recolorir fora dos tokens definidos.
- Versão monocroma (a obter) usada apenas em fundos escuros (V6).

---

## 4. Tom

Acolhedor, limpo, adequado a uma igreja. Tradução prática:

- **Cantos arredondados** generosos (`rounded-2xl` em cartões, `rounded-lg` em botões e inputs).
- **Sombras subtis** (`shadow-sm`); evitar sombras dramáticas estilo *neon* ou *glow*.
- **Espaçamento generoso** entre secções (mínimo `py-16` em desktop).
- **Sem gradientes berrantes**, *neon*, ou efeitos *brutalist*.
- **Sem cinzas frios saturados**; quando precisamos de neutro, usar `cream-bg` e `muted`.

---

## 5. Mockups vinculativos (V3)

`docs/branding/mockups-v3.jpeg` mostra quatro ecrãs. Vinculativos no nível da **estrutura e paleta**, não ao pixel.

| Ecrã                     | Notas                                                                                                              |
|--------------------------|--------------------------------------------------------------------------------------------------------------------|
| Catálogo de cursos       | Grelha de 3 cartões (alternância pêssego / sálvia / amarelo). Cada cartão: ícone, título display, seta laranja CTA.|
| Visualização de aula     | Vídeo 16:9 + sidebar com lista numerada de aulas + CTA "Próxima aula". Linha "Apostila.pdf · Descarregar".         |
| Detalhe de módulo / curso| Hero pêssego com ícone circular, título display, descrição, botão "Iniciar". Lista horizontal numerada de módulos. |
| Apostila                 | Cabeçalho com título display + botão "Descarregar" no canto. Conteúdo em corpo Inter.                              |

> O campo "Deixa a tua pergunta" visível no mockup da aula pertence à V5 e **não** está em V3 nem V4.

---

## 6. Decisões adiadas

- **Modo escuro** (V6): a definir uma paleta paralela. Provável: invés de inverter, uma paleta nocturna desenhada de raiz a partir do laranja primário.
- **Variantes do logótipo** (favicon, OG image, monocroma): a produzir após chegar SVG do ministério.
- **Iconografia ilustrativa** dos cartões de curso: por agora, ícones do `lucide-react` (livro, pessoas, estrela, etc.) tonalizados a `orange-primary`. Substituir por ilustrações próprias se houver justificação.

---

## 7. Histórico

- **05-05-2026** — Paleta hex fixada (8 tokens), Cormorant + Inter escolhidos, mockups movidos para `docs/branding/`. SPEC_1 §14 atualizado para v2.2. SVG do logo continua pendente do ministério.
- **05-05-2026** — SVG oficial recebido do ministério e versionado em `docs/branding/logo-cclx-logos.svg` (1600×913, 452 paths). Fallback de texto deixa de ser necessário; mantido como `aria-label`. Variante monocroma para V6 continua pendente.
- **09-05-2026** — shadcn/ui instalado (`base-nova`/Base UI, `baseColor: stone`, `radius: 0.625rem`); paleta CCLX mapeada para tokens semânticos shadcn (`--background`, `--primary`, etc.) em `:root` + `@theme inline`. §1 e §2 reescritas para Tailwind v4 (sem `tailwind.config.ts`). Detalhes em `feature-docs/shadcn-ui.md`.
