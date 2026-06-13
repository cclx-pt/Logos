# feature-docs/live.md — Canal LOGOS ao vivo (`/live`)

> **Estado:** entregue (V3.6, antecipação de V6). **Rota:** `/live`. **Nav:** entrada "Live" com badge de estado.
> **Origem:** spec do ministério "Canal YouTube" + SPEC_1.md §V6 (Live Stream), adaptado ao stack Next.js/Vercel.

## 1. O que faz

Entrada de navegação **"Live"** que dá acesso à transmissão em direto do canal
LOGOS no YouTube, reproduzida **dentro do portal** (embed `youtube-nocookie`),
sem redirecionar para o youtube.com.

- **Ao vivo:** a entrada fica clicável e mostra um badge **"Ao vivo"** (vermelho
  `#FF0000`, ponto a pulsar). Clicar abre `/live` com o leitor embebido.
- **Offline:** a entrada aparece cinzenta, com badge **"Offline"**, **não
  clicável** (`aria-disabled`, fora do tab order).
- **A carregar:** cinzenta, sem badge, não clicável.
- **Subscrever canal:** botão (link) que abre o YouTube já na caixa de
  confirmação de subscrição (`sub_confirmation=1`), visível em qualquer estado.

## 2. Porque não é a arquitetura "Node backend + cache em memória" do spec

O spec original pressupõe um backend de longa duração com uma **cache em memória
partilhada**. Em **Vercel (serverless)** isso não funciona: cada invocação tem a
sua própria memória, efémera — a cache não seria partilhada entre visitantes nem
sobreviveria entre pedidos, e a proteção de quota falharia em silêncio.

Adaptação:

- **"Backend"** → Route Handler `src/app/api/youtube/live-status/route.ts`.
- **"Cache partilhada"** → **Next.js Data Cache**: o `fetch` à YouTube API usa
  `next: { revalidate: TTL }`. É partilhado entre invocações e nativo do Vercel,
  sem infra extra. O cliente faz polling ao **nosso** endpoint (barato), nunca à
  API do YouTube.

## 3. Fronteira de quota (CRÍTICO)

A YouTube Data API v3 dá **10.000 unidades/dia**. `search.list` custa **100
unidades** → no máximo **100 pesquisas/dia**. Proteção em duas camadas:

1. **Janelas de transmissão** (`YOUTUBE_LIVE_WINDOWS`, timezone Europe/Lisbon):
   fora das janelas devolvemos `live:false` **sem** chamar a API
   (`isWithinLiveWindow`, em `src/lib/youtube/live-windows.ts`).
2. **Data Cache** com TTL (`YOUTUBE_CACHE_TTL_SECONDS`, default 180s): dentro da
   janela, só se chama a API quando a cache expira.

**Cálculo:** `chamadas/dia = (segundos de janela) / TTL`; `unidades = chamadas ×
100`, que deve ficar confortavelmente < 10.000.
Ex.: 1 janela de 3h/dia, TTL 180s → 60 chamadas × 100 = **6.000 unidades/dia**.

## 4. Fail-safe

Qualquer incerteza resolve para **offline** (nunca mostrar "ao vivo" sem
confirmação):

| Situação | Resultado |
|---|---|
| Fora das janelas | `live:false` (sem chamada à API) |
| Falta `YOUTUBE_API_KEY` | `live:false` + `stale:true` |
| Erro / `5xx` / quota esgotada | `live:false` + `stale:true` |
| Resposta sem `items` | `live:false` (canal parado, caso normal) |
| Resposta malformada | `live:false` |

`stale:true` serve para log/monitorização; a página nunca parte.

## 5. Ficheiros

| Ficheiro | Papel |
|---|---|
| `src/lib/youtube/live-windows.ts` | Parsing + gating das janelas (puro, testável) |
| `src/lib/youtube/live-status.ts` | Chamada à YouTube API + fail-safe + Data Cache (servidor) |
| `src/lib/youtube/use-live-status.ts` | Hook de polling (60s) ao nosso endpoint (cliente) |
| `src/lib/youtube/channel.ts` | IDs/links públicos do canal (subscrição) |
| `src/app/api/youtube/live-status/route.ts` | Endpoint que expõe o estado ao cliente |
| `src/app/live/page.tsx` | Página `/live` (render inicial do estado no servidor) |
| `src/components/site/live-player.tsx` | Leitor 16:9 + botão "Subscrever canal" |
| `src/components/site/live-badge.tsx` | Badge "Ao vivo"/"Offline" |
| `src/components/site/live-nav-link.tsx` | Entrada de nav com os 3 estados |

Integração: `header.tsx` (desktop) e `mobile-nav.tsx` renderizam `LiveNavLink`
ao lado de `NavLinks`. Animação do ponto em `globals.css` (`animate-live-pulse`,
desligada com `prefers-reduced-motion`).

## 6. Configuração (env)

| Variável | Default | Notas |
|---|---|---|
| `YOUTUBE_API_KEY` | — | **Só no servidor.** Nunca no bundle do cliente. |
| `YOUTUBE_CHANNEL_ID` | `UCcSXFqxY-XEjMMLLW2TXmtg` | Público |
| `YOUTUBE_LIVE_WINDOWS` | — | `"DOW HH:MM-HH:MM; ..."`, Europe/Lisbon. Sem janelas → sempre offline. |
| `YOUTUBE_CACHE_TTL_SECONDS` | `180` | Alinhar com o intervalo desejado de polling à API |

A chave configura-se no Google Cloud Console (YouTube Data API v3 → Credentials)
e define-se nos scopes Preview/Production da Vercel + `.env.local`.

## 7. Privacidade

- Embed via **`youtube-nocookie.com`** (coerente com o vídeo da homepage e com a
  Política de Privacidade): não define cookies de tracking até à reprodução.
- O `iframe` só é montado quando há transmissão e o utilizador está em `/live`.
- O botão "Subscrever" é um simples link de saída; não recolhe dados no portal.
- A `YOUTUBE_API_KEY` nunca chega ao cliente (verificável em DevTools → Network).

## 8. Acessibilidade

- Entrada offline: `aria-disabled="true"` e fora do tab order (não é `<a>`).
- Badge com texto legível ("Ao vivo"/"Offline") — não depende só da cor.
- `prefers-reduced-motion` desliga o pulsar do ponto.
- `iframe` com `title` descritivo.

## 9. Limitações conhecidas (MVP)

- **Streams fora das janelas configuradas não são detetados** (sem polling).
- **Quota esgotada a meio de uma transmissão** → a entrada cai para offline
  (fail-safe). Aceitável no MVP.
- Dois streams em simultâneo → usa-se `items[0]` (o mais recente).

## 10. Evolução futura (fora de âmbito)

- **WebSub/PubSubHubbub (push):** o YouTube notifica o servidor quando o canal
  inicia conteúdo, sem consumo de quota e em tempo real; a confirmação passa a
  poder usar `videos.list` (1 unidade) em vez de `search.list` (100). Recomendado
  se for preciso deteção fiável fora de janelas ou latência < 60s.
- Galeria de vídeos recentes; contagem de espetadores (`concurrentViewers`).
- Deteção de "já és subscritor" — **explicitamente fora de âmbito** (exigiria
  OAuth com scope sensível `youtube.readonly` e verificação da app pelo Google).

## 11. Testes

- `live-windows.test.ts` — parsing e gating de janelas (DST Europe/Lisbon, fim
  exclusivo, fail-safe sem janelas).
- `live-status.test.ts` — live/offline/stale, sem chamada fora de janela ou sem
  chave, parsing de respostas malformadas.
- `live-badge.test.tsx` — texto e presença/ausência do pulsar.
