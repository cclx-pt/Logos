# branding.md — Identidade Visual da Logos

> **Estado:** ✅ Paleta + tipografia fixadas (05-05-2026). 🚧 SVG do logótipo pendente.
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

### Mapeamento sugerido para `tailwind.config.ts`

```ts
// extend.colors
{
  cream: {
    bg:     '#FAF4EA',
    card:   '#FBE6D4',
    butter: '#F6E6C4',
  },
  sage:   { card: '#C6CDB1' },
  orange: {
    DEFAULT: '#E36A2C',
    hover:   '#C85A22',
  },
  ink:    '#1A1A1A',
  muted:  '#6B6B6B',
}
```

### Mapeamento sugerido para shadcn/ui (`globals.css`)

```css
:root {
  --background: 38 60% 95%;        /* cream-bg     #FAF4EA */
  --foreground: 0 0% 10%;          /* ink          #1A1A1A */
  --primary:    19 76% 53%;        /* orange       #E36A2C */
  --primary-foreground: 0 0% 100%;
  --muted:      38 30% 88%;
  --muted-foreground: 0 0% 42%;    /* muted        #6B6B6B */
  --accent:     27 87% 91%;        /* cream-card   #FBE6D4 */
  --accent-foreground: 0 0% 10%;
  --border:     38 30% 85%;
  --ring:       19 76% 53%;
  --radius:     0.625rem;
}
```

> Os valores HSL acima são aproximados; afinar visualmente quando o tema for instalado. Os hex de §14 são autoritativos; HSL é apenas a forma como o shadcn os consome.

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

### Carregamento (Next.js 15 App Router)

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

```ts
// tailwind.config.ts → extend.fontFamily
{
  sans:    ['var(--font-inter)', 'system-ui', 'sans-serif'],
  display: ['var(--font-cormorant)', 'Georgia', 'serif'],
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

- **Aprovado visualmente:** o wordmark "LOGOS" + livro aberto estilizado a linha laranja, visível em `docs/branding/mockups-v3.jpeg`.
- **Em falta:** ficheiro vetorial **SVG** entregue pelo ministério (e variante monocroma para fundos escuros futuros, V6).

### Fallback aceitável até chegar o SVG

Renderizar o wordmark em texto:

```tsx
<Link href="/" className="font-display text-2xl font-semibold text-orange tracking-wide">
  LOGOS
</Link>
```

A V1 pode arrancar e ir para produção com este *fallback*. O SVG é uma melhoria *drop-in* quando chegar (substituir o texto por `<Image>` ou inline SVG sem alterar layout).

### Regras quando o SVG chegar

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
