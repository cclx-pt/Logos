# og-image — Cartão de partilha (Open Graph) e favicon

> **Versão:** V1 (polimento tardio) · **Concluída em:** 14-05-2026 · **Autor(es):** João Ribeiro

## Objetivo

Dar ao site uma identidade própria quando partilhado e no separador do browser:

1. **Partilha** (WhatsApp, redes) — mostrava um cartão genérico da Vercel.
2. **Separador do browser** — mostrava o favicon por omissão do Next.js.

Ambos passam a usar o **logótipo completo Logos** (livro + letras "LOGOS").

## Comportamento

- Colar `logos.cclx.pt` em WhatsApp/Telegram/redes mostra um cartão 1200×630 com o
  logótipo completo centrado em fundo creme, mais o título e a descrição do site.
- O separador do browser mostra o logótipo Logos.
- Tudo definido no `layout.tsx` raiz / convenções de ficheiro do App Router; aplica-se
  a todas as páginas.

## Decisões técnicas

- **Causa do bug de partilha:** o `layout.tsx` só definia `title` + `description`. Sem
  `og:image` nem bloco `openGraph`, os scrapers caem para o fallback do alojador.
- **Logótipo completo, não só o livro.** Uma primeira iteração usou só o livro (sem
  letras); revertido por decisão de produto — o cartão e o ícone usam o logótipo
  inteiro (`public/logo-cclx-interiors.svg`).
- **Assets estáticos, não gerados em runtime.** `og-image.png`, `icon.png` e
  `favicon.ico` são ficheiros fixos compostos com `sharp` — sem `next/og`/Satori, sem
  código em runtime, sem dependência de file-tracing. A opção aborrecida e à prova de
  bala (CLAUDE.md).
- **Fundo do `og-image.png` é creme; o do `icon.png`/`favicon.ico` é transparente.**
  O cartão Open Graph precisa de fundo opaco — o WhatsApp e o Facebook renderizam PNG
  transparente como preto. O favicon, pelo contrário, deve ser transparente: o separador
  do browser tem o seu próprio fundo (claro ou escuro) e o logótipo deve flutuar nele.
- **Favicon como ICO com PNG embebido.** O `sharp` não escreve `.ico`, por isso o
  `favicon.ico` é montado à mão: cabeçalho ICO de 6 bytes + 1 entrada de directório de
  16 bytes + um PNG 48×48. Formato suportado por todos os browsers desde o Windows
  Vista. `icon.png` (512×512) cobre os browsers modernos via `<link rel="icon">`.
- **`metadataBase`** aposto a `siteConfig.url` para o Next resolver `/og-image.png` para
  URL absoluto (os scrapers exigem URL absoluto na `og:image`).

## Modelo de dados / API

Nenhum. Metadata estática + assets em `public/` e `src/app/`.

Ficheiros tocados:
- `src/app/layout.tsx` — blocos `openGraph` + `twitter` + `metadataBase`.
- `public/og-image.png` — cartão 1200×630, logótipo completo em fundo creme.
- `src/app/icon.png` — ícone 512×512, logótipo centrado em fundo transparente.
- `src/app/favicon.ico` — substitui o favicon por omissão do Next.js (logótipo 48×48,
  fundo transparente).

## Como regenerar os assets

Compostos com `sharp` (já em `node_modules` via Next). Rasterizar
`public/logo-cclx-interiors.svg` e fazer `composite` centrado: sobre tela creme
(`#faf4ea`) 1200×630 para o `og-image.png`; sobre tela **transparente** 512×512 para o
`icon.png` e 48×48 para o PNG dentro do `favicon.ico`.

## Limites conhecidos

- O WhatsApp guarda pré-visualizações em cache de forma agressiva. Links já partilhados
  podem continuar a mostrar o cartão antigo durante algum tempo; testar com um URL novo
  (ex.: `?v=2`) ou aguardar a expiração da cache.
- O logótipo é largo (~1,75:1). No separador do browser, a tamanhos muito pequenos
  (16px) as letras "LOGOS" ficam pouco legíveis — lê-se sobretudo a forma e a cor. Se
  no futuro se quiser um ícone mais nítido a 16px, recortar só o livro é alternativa.

## Testes

Sem testes automatizados (metadata estática + assets binários). Verificação manual: as
imagens foram inspecionadas visualmente; `pnpm typecheck`/`lint`/`test` verdes.
Pós-deploy, validar com o Facebook Sharing Debugger ou colando o link no WhatsApp.

## Referências

- PRs: `fix/og-image-whatsapp` (#28, versão livro-só), `fix/og-favicon-full-logo`
- `SPEC_1.md` — site público V1
