# v1-shell — Cabeçalho, rodapé e shell de navegação

> **Versão:** V1 (PR1 — fundação do site público) · **Última atualização:** 12-05-2026 · **Estado:** shell entregue; conteúdo das páginas internas chega em PR2 (Conhece-nos + Cursos) e PR3 (Fala connosco)

> **Nota (14-05-2026):** mudança de design posterior — o item de nav "Cursos" passou a **"Conteúdos"** e a rota `/cursos` deu lugar ao hub `/conteudos` (cartões *Cursos* + *Escola Bíblica*, sub-páginas em `/conteudos/cursos` e `/conteudos/escola-biblica`). As referências a `/cursos` neste documento são históricas. Ver `changelog.md` [14-05-2026] e `SPEC_1.md` §6.

## 1. Objetivo

Substituir a página única "Em construção" por um shell de site público com:

- **Cabeçalho global sticky** com wordmark Logos + navegação (Conhece-nos / Cursos / Fala connosco).
- **Hambúrguer mobile** que abre um painel de navegação em ecrãs `< md`.
- **Rodapé** com identidade CCLX, link à página da igreja e copyright.
- **Home** com hero a apresentar o projeto + CTAs para `/cursos` e `/conhece-nos`.
- **Stubs** para `/conhece-nos`, `/cursos`, `/fala-connosco` para que o nav não dê 404 entre PRs.

Tudo continua **inteiramente estático** — sem login, sem base de dados (regra V1 da `SPEC_1.md` §9.1).

## 2. Estrutura de ficheiros

```
src/
├── app/
│   ├── conhece-nos/page.tsx    [stub]
│   ├── cursos/page.tsx         [stub]
│   ├── fala-connosco/page.tsx  [stub]
│   ├── layout.tsx              [Header + main + Footer]
│   ├── page.tsx                [Home com hero]
│   ├── page.test.tsx           [3 testes]
│   ├── fonts.ts
│   └── globals.css
├── components/
│   └── site/
│       ├── logo.tsx            [wordmark "LOGOS" + BookOpen icon]
│       ├── nav-links.tsx       ['use client'; usePathname; reutilizado em desktop e mobile]
│       ├── mobile-nav.tsx      ['use client'; hambúrguer + painel deslizante]
│       ├── header.tsx          [server; Logo + MobileNav + NavLinks desktop]
│       └── footer.tsx          [server; Logo + descrição + link CCLX + © ano]
└── lib/
    └── site-config.ts          [siteConfig + navItems centralizados]
```

## 3. Decisões

### 3.1 Sem `Sheet` do shadcn

O painel mobile podia usar shadcn `Sheet` (drawer Base UI). Não foi instalado para esta PR porque:

- Adiciona dependência nova só para um painel simples.
- A roadmap V1 do `feature-docs/shadcn-ui.md` (`card/input/textarea/label/form`) não inclui `Sheet`.
- Um overlay `fixed inset-x-0 top-16 bottom-0` com toggle por `useState` cobre o caso (a11y mantida com `role="dialog" aria-modal="true"`, `Escape` para fechar, `aria-expanded` no botão).

Se em V2+ aparecer outro caso de drawer (filtros de cursos, perfil), reinstala-se `sheet` e refactor.

### 3.2 Logo como texto + ícone, não SVG

O SVG entregue em `docs/branding/logo-cclx-logos.svg` é uma traçagem rasterizada (452 paths, fundo `#F7F7F7` opaco que cobre todo o canvas). Renderizá-lo como está numa página `bg-cream-bg` mostra uma caixa cinzento-claro a sobrepor o fundo. Limpá-lo manualmente exigia editar paths individualmente.

Decisão: para V1, usar o **fallback de texto** previsto na `SPEC_1.md` §14 — wordmark *LOGOS* em Cormorant Garamond a `orange-primary` + ícone `BookOpen` da `lucide-react` (consistente com o estilo de linha laranja dos mockups). Substituir pelo SVG quando o ministério entregar uma versão limpa.

### 3.3 Estado activo do nav

`NavLinks` lê `usePathname()` (`'use client'`) e aplica:

- `aria-current="page"` na rota actual.
- Sublinhado `underline decoration-2 underline-offset-8` + cor `text-orange`.

Decisão consciente vs. parser server-side (`headers().get('x-pathname')`): client-side é o padrão Next.js para nav activo, evita necessidade de middleware extra.

### 3.4 Stubs para os 3 routes em vez de páginas reais

PR2 e PR3 vão completar `/conhece-nos`, `/cursos`, `/fala-connosco`. Stubs em PR1 garantem:

- Nav não dá 404 enquanto PRs estão a ser revistos.
- Cada PR seguinte é só substituição de conteúdo, não criação de route nova.

### 3.5 `Button render={<Link />}` em vez de `asChild`

Os componentes shadcn instalados via CLI v4 usam `@base-ui/react` (Base UI), não Radix. Base UI não tem `asChild` — usa **`render` prop**:

```tsx
<Button render={<Link href="/cursos" />}>Ver cursos</Button>
```

Documentado aqui para evitar a confusão repetida com a API Radix.

## 4. Acessibilidade

- `<html lang="pt-PT">` (mantido).
- `aria-label="Logos — voltar à página inicial"` no Logo em modo Link.
- `aria-label="Navegação principal"` no `<nav>`.
- `aria-current="page"` no item activo do nav.
- Hambúrguer: `aria-expanded`, `aria-controls="mobile-nav-panel"`, `aria-label` muda entre "Abrir menu" e "Fechar menu".
- Painel mobile: `role="dialog"`, `aria-modal="true"`, `aria-label="Menu de navegação"`, fecha com `Escape`, bloqueia scroll do body enquanto aberto.
- Focus rings visíveis (`focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`) em todos os interactivos.

## 5. Validação local (12-05-2026)

- `pnpm lint`, `pnpm typecheck`, `pnpm test --run` todos verdes.
- `pnpm dev` correu sem erros; rotas `/`, `/conhece-nos`, `/cursos`, `/fala-connosco` retornam 200; HTML SSR mostra header sticky, h1 do hero, footer.
- **Pendente verificação visual em browser real** (Claude Code não tem acesso a browser). O utilizador deve abrir `http://localhost:3000` e confirmar: (a) cabeçalho renderiza com logo + nav alinhados; (b) hambúrguer aparece em viewport `< md`; (c) painel mobile abre/fecha com hambúrguer e tecla Escape; (d) rodapé visível e legível; (e) sem regressões de paleta (creme + laranja).

## 6. O que vem a seguir

- **PR2 — Conhece-nos + Cursos**: copy real em PT-PT para `/conhece-nos` (missão, equipa, valores); `/cursos` ganha placeholder mais elaborado com "em breve" e expectativas.
- **PR3 — Fala connosco**: info estática (email `logos@cclx.pt`, morada CCLX, redes) + CTA `mailto:` (decisão tomada em chat: V1 sem form; Resend adiado para V5+ — ver `SPEC_1.md` §17).
- **Limpeza SVG do logo**: pedir ao ministério uma versão sem fundo opaco, ou aceitar wordmark textual como definitivo.

## 7. Referências

- `SPEC_1.md` §9.1 (V1), §14 (branding), §15 (princípios)
- `architecture.md` §3 (camadas)
- `feature-docs/branding.md` §1-§3 (paleta, tipografia, logo)
- `feature-docs/shadcn-ui.md` (mapeamento tokens, Base UI gotchas)
