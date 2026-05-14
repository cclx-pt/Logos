# og-image — Cartão de partilha (Open Graph)

> **Versão:** V1 (polimento tardio) · **Concluída em:** 14-05-2026 · **Autor(es):** João Ribeiro

## Objetivo

Partilhar `logos.cclx.pt` no WhatsApp (ou qualquer rede) mostrava um cartão genérico da
Vercel em vez da identidade Logos. Este fix dá ao site uma pré-visualização própria.

## Comportamento

- Ao colar o link em WhatsApp/Telegram/redes sociais, o cartão de pré-visualização mostra
  o **livro do logótipo CCLX** centrado em fundo creme, com o título e a descrição do site.
- Aplica-se a todas as páginas (definido no `layout.tsx` raiz); páginas futuras podem
  fazer override do `openGraph` na sua própria `metadata`.

## Decisões técnicas

- **Causa do bug:** o `layout.tsx` só definia `title` + `description`. Sem `og:image` nem
  bloco `openGraph`, os scrapers caem para o fallback do alojador — daí o cartão da Vercel.
- **Imagem estática, não gerada em runtime.** Optou-se por `public/og-image.png` (PNG fixo
  1200×630) em vez de `opengraph-image.tsx` com `next/og`/Satori. Sem código em runtime,
  sem dependência de file-tracing — a opção aborrecida e à prova de bala (CLAUDE.md).
- **Só o livro, sem letras.** Decisão do produto: o cartão é apenas o livro do logótipo,
  sobre fundo creme (`#faf4ea`), sem texto sobreposto.
- **Extração do livro.** O `public/logo-cclx-interiors.svg` é uma lista plana de 451
  `<path>` sem grupos. Calculando a bounding box de cada path, há um corte horizontal
  limpo em `y=440`: 299 paths ficam acima (as letras "LOGOS") e 152 abaixo (o livro),
  com **zero paths a atravessar** a fronteira. `public/logo-cclx-book.svg` mantém só os
  152 e reajusta o `viewBox` à caixa do livro com 24px de margem.
- **`metadataBase`** aposto a `siteConfig.url` para o Next resolver `/og-image.png` para
  URL absoluto (os scrapers exigem URL absoluto na `og:image`).

## Modelo de dados / API

Nenhum. Só metadata estática e dois assets em `public/`.

Ficheiros tocados:
- `src/app/layout.tsx` — blocos `openGraph` + `twitter` + `metadataBase`.
- `public/logo-cclx-book.svg` — livro isolado (novo).
- `public/og-image.png` — cartão 1200×630 (novo).

## Como regenerar o `og-image.png`

A imagem foi composta com `sharp` (já presente em `node_modules` via Next). Para
regenerar (ex.: novo logótipo, outra cor de fundo): rasterizar `logo-cclx-book.svg` a
~860px de largura e fazer `composite` centrado sobre uma tela 1200×630 a `#faf4ea`.

## Limites conhecidos

- O WhatsApp guarda pré-visualizações em cache de forma agressiva. Links já partilhados
  podem continuar a mostrar o cartão antigo durante algum tempo; testar com um URL novo
  (ex.: `?v=2`) ou aguardar a expiração da cache.
- O livro é um grafismo largo e baixo (~4,8:1), por isso o cartão tem bastante espaço
  vazio acima e abaixo — aceite, é o que o produto pediu ("apenas o livro").
- Não há favicon dedicado ao livro — o `src/app/favicon.ico` existente não foi tocado.

## Testes

Sem testes automatizados (metadata estática + assets binários). Verificação manual:
o `og-image.png` foi inspecionado visualmente; `pnpm typecheck`/`lint`/`test` verdes.
Pós-deploy, validar com o Facebook Sharing Debugger ou colando o link no WhatsApp.

## Referências

- PR: fix/og-image-whatsapp
- `SPEC_1.md` — site público V1
